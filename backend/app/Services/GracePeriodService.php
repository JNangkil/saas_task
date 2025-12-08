<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Mail\GracePeriodNotification;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;

/**
 * Grace Period Service
 * 
 * This service handles all grace period related functionality for subscriptions,
 * including checking grace period status, sending notifications, and handling
 * grace period expiration.
 */
class GracePeriodService
{
    /**
     * Check if a subscription is within grace period.
     *
     * @param Subscription $subscription
     * @return bool
     */
    public function isWithinGracePeriod(Subscription $subscription): bool
    {
        if (!$subscription->ends_at) {
            return false;
        }

        $gracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
        
        return $subscription->isCanceled() && $gracePeriodEnd->isFuture();
    }

    /**
     * Calculate grace period end date for a subscription.
     *
     * @param Subscription $subscription
     * @return Carbon
     */
    public function calculateGracePeriodEndDate(Subscription $subscription): Carbon
    {
        if (!$subscription->ends_at) {
            throw new Exception('Subscription has no end date');
        }

        $gracePeriodDays = $this->getGracePeriodDays();
        
        return $subscription->ends_at->copy()->addDays($gracePeriodDays);
    }

    /**
     * Send grace period notifications.
     *
     * @param Subscription $subscription
     * @param int $dayNumber
     * @return bool
     */
    public function sendGracePeriodNotification(Subscription $subscription, int $dayNumber): bool
    {
        try {
            if (!$this->isWithinGracePeriod($subscription)) {
                Log::warning('Attempted to send grace period notification for subscription not in grace period', [
                    'subscription_id' => $subscription->id,
                    'day_number' => $dayNumber,
                ]);
                return false;
            }

            $tenant = $subscription->tenant;
            if (!$tenant) {
                Log::error('Subscription has no associated tenant', [
                    'subscription_id' => $subscription->id,
                ]);
                return false;
            }

            $user = $tenant->users()->first();
            if (!$user) {
                Log::error('Tenant has no associated users', [
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                ]);
                return false;
            }

            $notification = new GracePeriodNotification($subscription, $dayNumber);
            
            Mail::to($user->email)->send($notification);

            // Log the notification
            Log::info('Grace period notification sent', [
                'subscription_id' => $subscription->id,
                'tenant_id' => $tenant->id,
                'user_email' => $user->email,
                'day_number' => $dayNumber,
            ]);

            // Create a subscription event for the notification
            SubscriptionEvent::createEvent($subscription, 'grace_period_notification', [
                'day_number' => $dayNumber,
                'user_email' => $user->email,
                'grace_period_ends_at' => $this->calculateGracePeriodEndDate($subscription)->toIso8601String(),
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Failed to send grace period notification', [
                'subscription_id' => $subscription->id,
                'day_number' => $dayNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Handle grace period expiration.
     *
     * @param Subscription $subscription
     * @return Subscription
     * @throws Exception
     */
    public function handleGracePeriodExpiration(Subscription $subscription): Subscription
    {
        if (!$this->isWithinGracePeriod($subscription)) {
            throw new Exception('Subscription is not within grace period');
        }

        $gracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
        
        if (!$gracePeriodEnd->isPast()) {
            throw new Exception('Grace period has not yet expired');
        }

        $stateManager = new SubscriptionStateManager();
        $expiredSubscription = $stateManager->expireSubscription($subscription);

        Log::info('Grace period expired, subscription marked as expired', [
            'subscription_id' => $subscription->id,
            'tenant_id' => $subscription->tenant_id,
            'grace_period_end' => $gracePeriodEnd->toIso8601String(),
        ]);

        return $expiredSubscription;
    }

    /**
     * Extend grace period for special cases.
     *
     * @param Subscription $subscription
     * @param int $additionalDays
     * @param string $reason
     * @return Subscription
     * @throws Exception
     */
    public function extendGracePeriod(Subscription $subscription, int $additionalDays, string $reason = ''): Subscription
    {
        if (!$subscription->isCanceled()) {
            throw new Exception('Subscription must be canceled to extend grace period');
        }

        if (!$subscription->ends_at) {
            throw new Exception('Subscription has no end date');
        }

        $currentGracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
        $newGracePeriodEnd = $currentGracePeriodEnd->addDays($additionalDays);

        // Store the extension in metadata
        $metadata = $subscription->metadata ?? [];
        $extensions = $metadata['grace_period_extensions'] ?? [];
        
        $extensions[] = [
            'extended_at' => now()->toIso8601String(),
            'additional_days' => $additionalDays,
            'reason' => $reason,
            'previous_end_date' => $currentGracePeriodEnd->toIso8601String(),
            'new_end_date' => $newGracePeriodEnd->toIso8601String(),
        ];

        $metadata['grace_period_extensions'] = $extensions;
        $metadata['extended_grace_period_end'] = $newGracePeriodEnd->toIso8601String();

        $subscription->update(['metadata' => $metadata]);

        // Create a subscription event for the extension
        SubscriptionEvent::createEvent($subscription, 'grace_period_extended', [
            'additional_days' => $additionalDays,
            'reason' => $reason,
            'new_grace_period_end' => $newGracePeriodEnd->toIso8601String(),
        ]);

        Log::info('Grace period extended', [
            'subscription_id' => $subscription->id,
            'tenant_id' => $subscription->tenant_id,
            'additional_days' => $additionalDays,
            'reason' => $reason,
            'new_grace_period_end' => $newGracePeriodEnd->toIso8601String(),
        ]);

        return $subscription->fresh();
    }

    /**
     * Get configured grace period days.
     *
     * @return int
     */
    public function getGracePeriodDays(): int
    {
        return Config::get('billing.grace_period_days', 7);
    }

    /**
     * Get configured grace period warning days.
     *
     * @return array
     */
    public function getGracePeriodWarningDays(): array
    {
        $warnings = Config::get('billing.grace_period_warnings', '1,3,7');
        
        // Parse comma-separated string if needed
        if (is_string($warnings)) {
            return array_map('intval', explode(',', $warnings));
        }
        
        return $warnings;
    }

    /**
     * Get all subscriptions that are currently in grace period.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getSubscriptionsInGracePeriod()
    {
        return Subscription::where('status', Subscription::STATUS_CANCELED)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get()
            ->filter(function ($subscription) {
                return $this->isWithinGracePeriod($subscription);
            });
    }

    /**
     * Get subscriptions that need grace period notifications today.
     *
     * @return \Illuminate\Support\Collection
     */
    public function getSubscriptionsNeedingNotifications()
    {
        $subscriptions = $this->getSubscriptionsInGracePeriod();
        $warningDays = $this->getGracePeriodWarningDays();
        $subscriptionsNeedingNotifications = collect();

        foreach ($subscriptions as $subscription) {
            $gracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
            $daysUntilExpiration = now()->diffInDays($gracePeriodEnd, false);

            // Check if today is a warning day
            if (in_array(abs($daysUntilExpiration), $warningDays)) {
                $dayNumber = abs($daysUntilExpiration);
                
                // Check if we've already sent this notification
                $metadata = $subscription->metadata ?? [];
                $sentNotifications = $metadata['grace_period_notifications_sent'] ?? [];
                
                if (!in_array($dayNumber, $sentNotifications)) {
                    $subscriptionsNeedingNotifications->push([
                        'subscription' => $subscription,
                        'day_number' => $dayNumber,
                        'days_until_expiration' => $daysUntilExpiration,
                    ]);
                }
            }
        }

        return $subscriptionsNeedingNotifications;
    }

    /**
     * Get subscriptions that have expired grace periods.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getSubscriptionsWithExpiredGracePeriod()
    {
        return Subscription::where('status', Subscription::STATUS_CANCELED)
            ->whereNotNull('ends_at')
            ->get()
            ->filter(function ($subscription) {
                try {
                    $gracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
                    return $gracePeriodEnd->isPast();
                } catch (Exception $e) {
                    return false;
                }
            });
    }

    /**
     * Mark a notification as sent for a subscription.
     *
     * @param Subscription $subscription
     * @param int $dayNumber
     * @return Subscription
     */
    public function markNotificationAsSent(Subscription $subscription, int $dayNumber): Subscription
    {
        $metadata = $subscription->metadata ?? [];
        $sentNotifications = $metadata['grace_period_notifications_sent'] ?? [];
        
        if (!in_array($dayNumber, $sentNotifications)) {
            $sentNotifications[] = $dayNumber;
            $metadata['grace_period_notifications_sent'] = $sentNotifications;
            
            $subscription->update(['metadata' => $metadata]);
        }

        return $subscription->fresh();
    }

    /**
     * Get grace period status information for a subscription.
     *
     * @param Subscription $subscription
     * @return array
     */
    public function getGracePeriodStatus(Subscription $subscription): array
    {
        if (!$subscription->isCanceled() || !$subscription->ends_at) {
            return [
                'in_grace_period' => false,
                'grace_period_end' => null,
                'days_remaining' => 0,
                'warnings_sent' => [],
            ];
        }

        try {
            $gracePeriodEnd = $this->calculateGracePeriodEndDate($subscription);
            $daysRemaining = now()->diffInDays($gracePeriodEnd, false);
            $metadata = $subscription->metadata ?? [];
            $warningsSent = $metadata['grace_period_notifications_sent'] ?? [];

            return [
                'in_grace_period' => $daysRemaining >= 0,
                'grace_period_end' => $gracePeriodEnd->toIso8601String(),
                'days_remaining' => max(0, $daysRemaining),
                'warnings_sent' => $warningsSent,
            ];
        } catch (Exception $e) {
            return [
                'in_grace_period' => false,
                'grace_period_end' => null,
                'days_remaining' => 0,
                'warnings_sent' => [],
                'error' => $e->getMessage(),
            ];
        }
    }
}