<?php

namespace App\Jobs;

use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\BillingProviders\BillingProviderFactory;
use App\Services\SubscriptionStateManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Process Stripe Webhook Job
 * 
 * This job handles the asynchronous processing of Stripe webhook events.
 * It processes webhook events in the background to ensure fast webhook
 * responses and reliable processing even if the webhook fails.
 */
class ProcessStripeWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public array $backoff = [10, 30, 60];

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 120;

    /**
     * The Stripe event data.
     */
    protected array $event;

    /**
     * The Stripe event ID.
     */
    protected string $eventId;

    /**
     * The Stripe event type.
     */
    protected string $eventType;

    /**
     * Create a new job instance.
     */
    public function __construct(array $event)
    {
        $this->event = $event;
        $this->eventId = $event['id'];
        $this->eventType = $event['type'];
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Check if the event has already been processed
        if ($this->isEventProcessed()) {
            Log::info('Stripe webhook event already processed in job', [
                'event_id' => $this->eventId,
                'event_type' => $this->eventType,
            ]);

            return;
        }

        Log::info('Processing Stripe webhook event in job', [
            'event_id' => $this->eventId,
            'event_type' => $this->eventType,
            'attempt' => $this->attempts(),
        ]);

        try {
            // Process the event based on its type
            $result = $this->processStripeEvent();

            // Mark the event as processed
            $this->markEventAsProcessed();

            Log::info('Stripe webhook event processed successfully in job', [
                'event_id' => $this->eventId,
                'event_type' => $this->eventType,
                'result' => $result,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to process Stripe webhook event in job', [
                'event_id' => $this->eventId,
                'event_type' => $this->eventType,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw the exception to trigger job retry
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error('Stripe webhook job failed permanently', [
            'event_id' => $this->eventId,
            'event_type' => $this->eventType,
            'attempts' => $this->attempts(),
            'error' => $exception->getMessage(),
        ]);

        // Create a failed webhook event record for manual review
        DB::table('failed_webhook_events')->insert([
            'event_id' => $this->eventId,
            'provider' => 'stripe',
            'event_type' => $this->eventType,
            'event_data' => json_encode($this->event),
            'error_message' => $exception->getMessage(),
            'failed_at' => now(),
        ]);
    }

    /**
     * Process a Stripe webhook event based on its type.
     */
    protected function processStripeEvent(): array
    {
        $eventData = $this->event['data']['object'] ?? [];
        $stateManager = new SubscriptionStateManager();

        switch ($this->eventType) {
            case 'customer.subscription.created':
                return $this->handleSubscriptionCreated($eventData);

            case 'customer.subscription.updated':
                return $this->handleSubscriptionUpdated($eventData, $stateManager);

            case 'customer.subscription.deleted':
                return $this->handleSubscriptionDeleted($eventData, $stateManager);

            case 'invoice.payment_succeeded':
                return $this->handlePaymentSucceeded($eventData, $stateManager);

            case 'invoice.payment_failed':
                return $this->handlePaymentFailed($eventData, $stateManager);

            case 'customer.subscription.trial_will_end':
                return $this->handleTrialWillEnd($eventData);

            case 'invoice.upcoming':
                return $this->handleInvoiceUpcoming($eventData);

            default:
                Log::info('Unhandled Stripe webhook event type in job', [
                    'event_type' => $this->eventType,
                    'event_id' => $this->eventId,
                ]);

                return ['status' => 'ignored', 'reason' => 'Unhandled event type'];
        }
    }

    /**
     * Handle customer.subscription.created event.
     */
    protected function handleSubscriptionCreated(array $data): array
    {
        $stripeSubscriptionId = $data['id'] ?? null;
        $stripeCustomerId = $data['customer'] ?? null;
        $status = $data['status'] ?? null;
        $trialEnd = $data['trial_end'] ?? null;

        if (!$stripeSubscriptionId || !$stripeCustomerId) {
            throw new Exception('Missing required subscription data');
        }

        // Find the tenant by Stripe customer ID
        $tenant = Tenant::where('stripe_customer_id', $stripeCustomerId)->first();
        if (!$tenant) {
            throw new Exception("Tenant not found for customer: {$stripeCustomerId}");
        }

        // Find or create the subscription
        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        
        if (!$subscription) {
            // Try to find the plan by Stripe price ID
            $priceId = $data['items']['data'][0]['price']['id'] ?? null;
            if (!$priceId) {
                throw new Exception('Missing price ID in subscription data');
            }

            $plan = Plan::where('stripe_price_id', $priceId)->first();
            if (!$plan) {
                throw new Exception("Plan not found for price ID: {$priceId}");
            }

            DB::beginTransaction();
            try {
                $subscription = Subscription::create([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                    'stripe_subscription_id' => $stripeSubscriptionId,
                    'stripe_customer_id' => $stripeCustomerId,
                    'status' => $status,
                    'trial_ends_at' => $trialEnd ? now()->setTimestamp($trialEnd) : null,
                    'metadata' => [
                        'stripe_event_id' => $this->eventId,
                        'processed_by_job' => true,
                    ],
                ]);

                // Create subscription created event
                SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_CREATED, [
                    'stripe_subscription_id' => $stripeSubscriptionId,
                    'status' => $status,
                    'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                ]);

                DB::commit();

                return [
                    'status' => 'created',
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $tenant->id,
                ];
            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } else {
            // Update existing subscription
            $subscription->update([
                'status' => $status,
                'trial_ends_at' => $trialEnd ? now()->setTimestamp($trialEnd) : null,
            ]);

            return [
                'status' => 'updated',
                'subscription_id' => $subscription->id,
                'tenant_id' => $tenant->id,
            ];
        }
    }

    /**
     * Handle customer.subscription.updated event.
     */
    protected function handleSubscriptionUpdated(array $data, SubscriptionStateManager $stateManager): array
    {
        $stripeSubscriptionId = $data['id'] ?? null;
        $status = $data['status'] ?? null;
        $trialEnd = $data['trial_end'] ?? null;
        $canceledAt = $data['canceled_at'] ?? null;
        $endedAt = $data['ended_at'] ?? null;

        if (!$stripeSubscriptionId) {
            throw new Exception('Missing subscription ID');
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            throw new Exception("Subscription not found: {$stripeSubscriptionId}");
        }

        $previousStatus = $subscription->status;
        $updateData = [];

        // Update status if changed
        if ($status && $status !== $previousStatus) {
            // Use state manager for valid status transitions
            if ($stateManager->isValidTransition($previousStatus, $status)) {
                $updateData['status'] = $status;
            } else {
                Log::warning('Invalid subscription status transition in job', [
                    'subscription_id' => $subscription->id,
                    'from' => $previousStatus,
                    'to' => $status,
                ]);
            }
        }

        // Update trial end date
        if ($trialEnd !== null) {
            $updateData['trial_ends_at'] = $trialEnd ? now()->setTimestamp($trialEnd) : null;
        }

        // Update cancellation dates
        if ($canceledAt) {
            $updateData['canceled_at'] = now()->setTimestamp($canceledAt);
        }

        if ($endedAt) {
            $updateData['ends_at'] = now()->setTimestamp($endedAt);
        }

        if (!empty($updateData)) {
            $subscription->update($updateData);

            // Create subscription updated event
            SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_UPDATED, [
                'previous_status' => $previousStatus,
                'new_status' => $status,
                'changes' => $updateData,
            ]);
        }

        return [
            'status' => 'updated',
            'subscription_id' => $subscription->id,
            'changes' => $updateData,
        ];
    }

    /**
     * Handle customer.subscription.deleted event.
     */
    protected function handleSubscriptionDeleted(array $data, SubscriptionStateManager $stateManager): array
    {
        $stripeSubscriptionId = $data['id'] ?? null;
        $endedAt = $data['ended_at'] ?? null;

        if (!$stripeSubscriptionId) {
            throw new Exception('Missing subscription ID');
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            throw new Exception("Subscription not found: {$stripeSubscriptionId}");
        }

        // Mark subscription as expired
        $stateManager->expireSubscription($subscription);

        // Update end date if provided
        if ($endedAt) {
            $subscription->update(['ends_at' => now()->setTimestamp($endedAt)]);
        }

        return [
            'status' => 'deleted',
            'subscription_id' => $subscription->id,
            'ended_at' => $subscription->ends_at,
        ];
    }

    /**
     * Handle invoice.payment_succeeded event.
     */
    protected function handlePaymentSucceeded(array $data, SubscriptionStateManager $stateManager): array
    {
        $stripeSubscriptionId = $data['subscription'] ?? null;
        $amountPaid = $data['amount_paid'] ?? 0;
        $currency = $data['currency'] ?? 'usd';

        if (!$stripeSubscriptionId) {
            // This might be a one-time payment, not a subscription
            return ['status' => 'ignored', 'reason' => 'Not a subscription payment'];
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            throw new Exception("Subscription not found: {$stripeSubscriptionId}");
        }

        // If subscription was past due, reactivate it
        if ($subscription->status === Subscription::STATUS_PAST_DUE) {
            $stateManager->activateSubscription($subscription);
        }

        // Create payment succeeded event
        SubscriptionEvent::paymentSucceeded($subscription, [
            'amount_paid' => $amountPaid,
            'currency' => $currency,
            'stripe_invoice_id' => $data['id'] ?? null,
        ]);

        return [
            'status' => 'payment_processed',
            'subscription_id' => $subscription->id,
            'amount_paid' => $amountPaid,
            'currency' => $currency,
        ];
    }

    /**
     * Handle invoice.payment_failed event.
     */
    protected function handlePaymentFailed(array $data, SubscriptionStateManager $stateManager): array
    {
        $stripeSubscriptionId = $data['subscription'] ?? null;
        $amountDue = $data['amount_due'] ?? 0;
        $currency = $data['currency'] ?? 'usd';
        $attemptCount = $data['attempt_count'] ?? 1;

        if (!$stripeSubscriptionId) {
            // This might be a one-time payment, not a subscription
            return ['status' => 'ignored', 'reason' => 'Not a subscription payment'];
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            throw new Exception("Subscription not found: {$stripeSubscriptionId}");
        }

        // Mark subscription as past due
        if ($subscription->isActive() || $subscription->isTrialing()) {
            $stateManager->markAsPastDue($subscription);
        }

        // Create payment failed event
        SubscriptionEvent::paymentFailed($subscription, [
            'amount_due' => $amountDue,
            'currency' => $currency,
            'attempt_count' => $attemptCount,
            'stripe_invoice_id' => $data['id'] ?? null,
            'next_payment_attempt' => $data['next_payment_attempt'] ?? null,
        ]);

        return [
            'status' => 'payment_failed',
            'subscription_id' => $subscription->id,
            'amount_due' => $amountDue,
            'currency' => $currency,
            'attempt_count' => $attemptCount,
        ];
    }

    /**
     * Handle customer.subscription.trial_will_end event.
     */
    protected function handleTrialWillEnd(array $data): array
    {
        $stripeSubscriptionId = $data['id'] ?? null;
        $trialEnd = $data['trial_end'] ?? null;

        if (!$stripeSubscriptionId) {
            throw new Exception('Missing subscription ID');
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            throw new Exception("Subscription not found: {$stripeSubscriptionId}");
        }

        // Create trial will end event for notification purposes
        SubscriptionEvent::createEvent($subscription, 'trial_will_end', [
            'trial_ends_at' => $trialEnd ? now()->setTimestamp($trialEnd)->toIso8601String() : null,
            'days_remaining' => $trialEnd ? now()->diffInDays(now()->setTimestamp($trialEnd)) : 0,
        ]);

        return [
            'status' => 'trial_ending',
            'subscription_id' => $subscription->id,
            'trial_ends_at' => $trialEnd ? now()->setTimestamp($trialEnd)->toIso8601String() : null,
        ];
    }

    /**
     * Handle invoice.upcoming event.
     */
    protected function handleInvoiceUpcoming(array $data): array
    {
        $stripeSubscriptionId = $data['subscription'] ?? null;
        $amountDue = $data['amount_due'] ?? 0;
        $currency = $data['currency'] ?? 'usd';
        $nextPaymentAttempt = $data['next_payment_attempt'] ?? null;

        if (!$stripeSubscriptionId) {
            return ['status' => 'ignored', 'reason' => 'Not a subscription invoice'];
        }

        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscriptionId)->first();
        if (!$subscription) {
            // Log warning but don't throw exception for upcoming invoices
            Log::warning('Subscription not found for upcoming invoice in job', [
                'stripe_subscription_id' => $stripeSubscriptionId,
            ]);

            return ['status' => 'ignored', 'reason' => 'Subscription not found'];
        }

        // Create upcoming invoice event for notification purposes
        SubscriptionEvent::createEvent($subscription, 'invoice_upcoming', [
            'amount_due' => $amountDue,
            'currency' => $currency,
            'next_payment_attempt' => $nextPaymentAttempt ? now()->setTimestamp($nextPaymentAttempt)->toIso8601String() : null,
            'stripe_invoice_id' => $data['id'] ?? null,
        ]);

        return [
            'status' => 'invoice_upcoming',
            'subscription_id' => $subscription->id,
            'amount_due' => $amountDue,
            'currency' => $currency,
        ];
    }

    /**
     * Check if a webhook event has already been processed.
     */
    protected function isEventProcessed(): bool
    {
        return DB::table('processed_webhook_events')
            ->where('event_id', $this->eventId)
            ->where('provider', 'stripe')
            ->exists();
    }

    /**
     * Mark a webhook event as processed.
     */
    protected function markEventAsProcessed(): bool
    {
        try {
            return DB::table('processed_webhook_events')->insert([
                'event_id' => $this->eventId,
                'provider' => 'stripe',
                'processed_at' => now(),
            ]);
        } catch (Exception $e) {
            Log::error('Failed to mark webhook event as processed in job', [
                'event_id' => $this->eventId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}