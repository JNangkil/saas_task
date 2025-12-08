<?php

namespace App\Jobs;

use App\Services\GracePeriodService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Grace Period Job
 * 
 * This job runs daily to check for expiring grace periods, send warning emails,
 * and expire subscriptions that have exceeded their grace period.
 */
class GracePeriodJob implements ShouldQueue
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
    public int $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        // Set the queue for this job
        $this->onQueue('billing');
    }

    /**
     * Execute the job.
     */
    public function handle(GracePeriodService $gracePeriodService): void
    {
        Log::info('Starting grace period job', [
            'job_id' => $this->job->getJobId(),
            'attempt' => $this->attempts(),
        ]);

        try {
            // Process grace period notifications
            $this->processGracePeriodNotifications($gracePeriodService);

            // Process expired grace periods
            $this->processExpiredGracePeriods($gracePeriodService);

            Log::info('Grace period job completed successfully', [
                'job_id' => $this->job->getJobId(),
            ]);
        } catch (\Exception $e) {
            Log::error('Grace period job failed', [
                'job_id' => $this->job->getJobId(),
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw the exception to trigger job retry
            throw $e;
        }
    }

    /**
     * Process grace period notifications.
     */
    protected function processGracePeriodNotifications(GracePeriodService $gracePeriodService): void
    {
        $subscriptionsNeedingNotifications = $gracePeriodService->getSubscriptionsNeedingNotifications();
        
        Log::info('Processing grace period notifications', [
            'subscriptions_count' => $subscriptionsNeedingNotifications->count(),
        ]);

        foreach ($subscriptionsNeedingNotifications as $item) {
            $subscription = $item['subscription'];
            $dayNumber = $item['day_number'];
            $daysUntilExpiration = $item['days_until_expiration'];

            try {
                // Send the notification
                $success = $gracePeriodService->sendGracePeriodNotification($subscription, $dayNumber);

                if ($success) {
                    // Mark the notification as sent
                    $gracePeriodService->markNotificationAsSent($subscription, $dayNumber);

                    Log::info('Grace period notification sent successfully', [
                        'subscription_id' => $subscription->id,
                        'tenant_id' => $subscription->tenant_id,
                        'day_number' => $dayNumber,
                        'days_until_expiration' => $daysUntilExpiration,
                    ]);
                } else {
                    Log::warning('Failed to send grace period notification', [
                        'subscription_id' => $subscription->id,
                        'tenant_id' => $subscription->tenant_id,
                        'day_number' => $dayNumber,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error processing grace period notification', [
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $subscription->tenant_id,
                    'day_number' => $dayNumber,
                    'error' => $e->getMessage(),
                ]);
                // Continue with next subscription even if one fails
            }
        }
    }

    /**
     * Process expired grace periods.
     */
    protected function processExpiredGracePeriods(GracePeriodService $gracePeriodService): void
    {
        $expiredSubscriptions = $gracePeriodService->getSubscriptionsWithExpiredGracePeriod();
        
        Log::info('Processing expired grace periods', [
            'subscriptions_count' => $expiredSubscriptions->count(),
        ]);

        foreach ($expiredSubscriptions as $subscription) {
            try {
                // Expire the subscription
                $expiredSubscription = $gracePeriodService->handleGracePeriodExpiration($subscription);

                Log::info('Subscription expired due to grace period ending', [
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $subscription->tenant_id,
                    'previous_status' => $subscription->status,
                    'new_status' => $expiredSubscription->status,
                ]);
            } catch (\Exception $e) {
                Log::error('Error expiring subscription with expired grace period', [
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $subscription->tenant_id,
                    'error' => $e->getMessage(),
                ]);
                // Continue with next subscription even if one fails
            }
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Exception $exception): void
    {
        Log::error('Grace period job failed permanently', [
            'job_id' => $this->job->getJobId(),
            'attempts' => $this->attempts(),
            'error' => $exception->getMessage(),
        ]);
    }
}