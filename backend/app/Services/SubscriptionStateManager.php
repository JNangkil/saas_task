<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class SubscriptionStateManager
{
    /**
     * Valid state transitions matrix.
     * Key is the current state, value is an array of allowed next states.
     */
    private const VALID_TRANSITIONS = [
        Subscription::STATUS_TRIALING => [
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_PAST_DUE,
            Subscription::STATUS_CANCELED,
        ],
        Subscription::STATUS_ACTIVE => [
            Subscription::STATUS_PAST_DUE,
            Subscription::STATUS_CANCELED,
        ],
        Subscription::STATUS_PAST_DUE => [
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_EXPIRED,
            Subscription::STATUS_CANCELED,
        ],
        Subscription::STATUS_CANCELED => [
            Subscription::STATUS_EXPIRED,
        ],
        Subscription::STATUS_EXPIRED => [], // Terminal state
    ];

    /**
     * Start a trial period for a subscription.
     *
     * @param Subscription $subscription
     * @param int $trialDays
     * @return Subscription
     * @throws Exception
     */
    public function startTrial(Subscription $subscription, int $trialDays): Subscription
    {
        $currentState = $subscription->status;
        $targetState = Subscription::STATUS_TRIALING;

        // Only allow starting trial from a new subscription (no status yet) or from expired
        if ($currentState && !$this->isValidTransition($currentState, $targetState)) {
            throw new Exception("Cannot transition from {$currentState} to {$targetState}");
        }

        $trialEndsAt = now()->addDays($trialDays);
        
        $subscription->update([
            'status' => $targetState,
            'trial_ends_at' => $trialEndsAt,
        ]);

        // Record the state change
        $this->recordStateChange(
            $subscription,
            $currentState ?: 'none',
            $targetState,
            ['trial_days' => $trialDays, 'trial_ends_at' => $trialEndsAt->toIso8601String()]
        );

        // Create a trial started event
        SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_TRIAL_STARTED, [
            'trial_days' => $trialDays,
            'trial_ends_at' => $trialEndsAt->toIso8601String(),
        ]);

        Log::info("Subscription {$subscription->id} started trial for {$trialDays} days");

        return $subscription->fresh();
    }

    /**
     * Activate a subscription.
     *
     * @param Subscription $subscription
     * @param string|null $stripeSubscriptionId
     * @return Subscription
     * @throws Exception
     */
    public function activateSubscription(Subscription $subscription, ?string $stripeSubscriptionId = null): Subscription
    {
        $currentState = $subscription->status;
        $targetState = Subscription::STATUS_ACTIVE;

        if (!$this->isValidTransition($currentState, $targetState)) {
            throw new Exception("Cannot transition from {$currentState} to {$targetState}");
        }

        $updateData = [
            'status' => $targetState,
        ];

        // Set Stripe subscription ID if provided
        if ($stripeSubscriptionId) {
            $updateData['stripe_subscription_id'] = $stripeSubscriptionId;
        }

        // Clear trial end date if activating from trial
        if ($currentState === Subscription::STATUS_TRIALING) {
            $updateData['trial_ends_at'] = null;
        }

        $subscription->update($updateData);

        // Record the state change
        $this->recordStateChange(
            $subscription,
            $currentState,
            $targetState,
            ['stripe_subscription_id' => $stripeSubscriptionId]
        );

        // Create appropriate event
        $eventType = $currentState === Subscription::STATUS_TRIALING 
            ? SubscriptionEvent::TYPE_TRIAL_ENDED 
            : SubscriptionEvent::TYPE_UPDATED;

        SubscriptionEvent::createEvent($subscription, $eventType, [
            'previous_status' => $currentState,
            'stripe_subscription_id' => $stripeSubscriptionId,
        ]);

        Log::info("Subscription {$subscription->id} activated", [
            'previous_status' => $currentState,
            'stripe_subscription_id' => $stripeSubscriptionId,
        ]);

        return $subscription->fresh();
    }

    /**
     * Mark a subscription as past due.
     *
     * @param Subscription $subscription
     * @return Subscription
     * @throws Exception
     */
    public function markAsPastDue(Subscription $subscription): Subscription
    {
        $currentState = $subscription->status;
        $targetState = Subscription::STATUS_PAST_DUE;

        if (!$this->isValidTransition($currentState, $targetState)) {
            throw new Exception("Cannot transition from {$currentState} to {$targetState}");
        }

        $subscription->update(['status' => $targetState]);

        // Record the state change
        $this->recordStateChange($subscription, $currentState, $targetState);

        // Create a payment failed event
        SubscriptionEvent::paymentFailed($subscription, [
            'previous_status' => $currentState,
        ]);

        Log::warning("Subscription {$subscription->id} marked as past due", [
            'previous_status' => $currentState,
        ]);

        return $subscription->fresh();
    }

    /**
     * Cancel a subscription.
     *
     * @param Subscription $subscription
     * @param bool $immediately
     * @return Subscription
     * @throws Exception
     */
    public function cancelSubscription(Subscription $subscription, bool $immediately = false): Subscription
    {
        $currentState = $subscription->status;
        $targetState = Subscription::STATUS_CANCELED;

        if (!$this->isValidTransition($currentState, $targetState)) {
            throw new Exception("Cannot transition from {$currentState} to {$targetState}");
        }

        $updateData = ['status' => $targetState];

        // If canceling immediately, set ends_at to now
        if ($immediately) {
            $updateData['ends_at'] = now();
        } elseif (!$subscription->ends_at) {
            // If no end date is set, set it to trial end or current period end
            $updateData['ends_at'] = $subscription->trial_ends_at ?? now()->addMonth();
        }

        $subscription->update($updateData);

        // Record the state change
        $this->recordStateChange(
            $subscription,
            $currentState,
            $targetState,
            ['immediately' => $immediately, 'ends_at' => $subscription->ends_at?->toIso8601String()]
        );

        // Create a canceled event
        SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_CANCELED, [
            'previous_status' => $currentState,
            'immediately' => $immediately,
            'ends_at' => $subscription->ends_at?->toIso8601String(),
        ]);

        Log::info("Subscription {$subscription->id} canceled", [
            'previous_status' => $currentState,
            'immediately' => $immediately,
            'ends_at' => $subscription->ends_at,
        ]);

        return $subscription->fresh();
    }

    /**
     * Expire a subscription.
     *
     * @param Subscription $subscription
     * @return Subscription
     * @throws Exception
     */
    public function expireSubscription(Subscription $subscription): Subscription
    {
        $currentState = $subscription->status;
        $targetState = Subscription::STATUS_EXPIRED;

        if (!$this->isValidTransition($currentState, $targetState)) {
            throw new Exception("Cannot transition from {$currentState} to {$targetState}");
        }

        $subscription->update([
            'status' => $targetState,
            'ends_at' => now(), // Ensure ends_at is set to now
        ]);

        // Record the state change
        $this->recordStateChange($subscription, $currentState, $targetState);

        // Create an expired event
        SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_EXPIRED, [
            'previous_status' => $currentState,
        ]);

        Log::info("Subscription {$subscription->id} expired", [
            'previous_status' => $currentState,
        ]);

        return $subscription->fresh();
    }

    /**
     * Check if a state transition is valid.
     *
     * @param string $from
     * @param string $to
     * @return bool
     */
    public function isValidTransition(string $from, string $to): bool
    {
        // Allow transition to trialing if subscription has no status yet
        if ($to === Subscription::STATUS_TRIALING && $from === 'none') {
            return true;
        }

        return isset(self::VALID_TRANSITIONS[$from]) && 
               in_array($to, self::VALID_TRANSITIONS[$from]);
    }

    /**
     * Record a state change in the subscription events.
     *
     * @param Subscription $subscription
     * @param string $from
     * @param string $to
     * @param array $data
     * @return SubscriptionEvent
     */
    public function recordStateChange(Subscription $subscription, string $from, string $to, array $data = []): SubscriptionEvent
    {
        $eventData = array_merge($data, [
            'previous_status' => $from,
            'new_status' => $to,
        ]);

        return SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_UPDATED, $eventData);
    }

    /**
     * Process grace period for a subscription.
     * This method should be called periodically (e.g., via a scheduled job).
     *
     * @param Subscription $subscription
     * @return Subscription|null Returns updated subscription or null if no action needed
     */
    public function processGracePeriod(Subscription $subscription): ?Subscription
    {
        // Only process grace period for canceled subscriptions
        if (!$subscription->isCanceled() || !$subscription->ends_at) {
            return null;
        }

        // Check if the grace period has ended (7 days after ends_at)
        $gracePeriodEnd = $subscription->ends_at->copy()->addDays(7);
        
        if (now()->greaterThan($gracePeriodEnd)) {
            return $this->expireSubscription($subscription);
        }

        return null;
    }

    /**
     * Get all valid transitions for a given state.
     *
     * @param string $state
     * @return array
     */
    public function getValidTransitions(string $state): array
    {
        return self::VALID_TRANSITIONS[$state] ?? [];
    }

    /**
     * Check if a subscription can transition to a specific state.
     *
     * @param Subscription $subscription
     * @param string $targetState
     * @return bool
     */
    public function canTransitionTo(Subscription $subscription, string $targetState): bool
    {
        $currentState = $subscription->status;
        return $this->isValidTransition($currentState, $targetState);
    }
}