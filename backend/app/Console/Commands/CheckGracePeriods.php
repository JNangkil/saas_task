<?php

namespace App\Console\Commands;

use App\Jobs\GracePeriodJob;
use App\Services\GracePeriodService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Check Grace Periods Command
 * 
 * This command allows manual triggering of grace period checks for subscriptions.
 * It can be used to process notifications and handle expired grace periods.
 */
class CheckGracePeriods extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:check-grace-periods 
                            {--notifications : Process grace period notifications only}
                            {--expirations : Process expired grace periods only}
                            {--force : Force processing even if not scheduled}
                            {--dry-run : Show what would be processed without actually processing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and process subscription grace periods';

    /**
     * The grace period service instance.
     */
    protected GracePeriodService $gracePeriodService;

    /**
     * Create a new command instance.
     */
    public function __construct(GracePeriodService $gracePeriodService)
    {
        parent::__construct();
        $this->gracePeriodService = $gracePeriodService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting grace period check...');
        
        $processNotifications = $this->option('notifications') || !$this->option('expirations');
        $processExpirations = $this->option('expirations') || !$this->option('notifications');
        $isDryRun = $this->option('dry-run');
        
        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No actual processing will occur');
        }

        try {
            if ($processNotifications) {
                $this->processNotifications($isDryRun);
            }

            if ($processExpirations) {
                $this->processExpirations($isDryRun);
            }

            $this->info('Grace period check completed successfully.');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Grace period check failed: ' . $e->getMessage());
            Log::error('Grace period check command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Process grace period notifications.
     */
    protected function processNotifications(bool $isDryRun): void
    {
        $this->info('Checking for grace period notifications...');
        
        $subscriptionsNeedingNotifications = $this->gracePeriodService->getSubscriptionsNeedingNotifications();
        
        if ($subscriptionsNeedingNotifications->isEmpty()) {
            $this->info('No subscriptions require grace period notifications at this time.');
            return;
        }

        $this->info("Found {$subscriptionsNeedingNotifications->count()} subscriptions needing notifications:");
        
        foreach ($subscriptionsNeedingNotifications as $item) {
            $subscription = $item['subscription'];
            $dayNumber = $item['day_number'];
            $daysUntilExpiration = $item['days_until_expiration'];
            
            $this->line("  - Subscription #{$subscription->id} (Tenant: {$subscription->tenant_id})");
            $this->line("    Day {$dayNumber} notification ({$daysUntilExpiration} days until expiration)");
            
            if (!$isDryRun) {
                $success = $this->gracePeriodService->sendGracePeriodNotification($subscription, $dayNumber);
                
                if ($success) {
                    $this->gracePeriodService->markNotificationAsSent($subscription, $dayNumber);
                    $this->info("    ✓ Notification sent successfully");
                } else {
                    $this->error("    ✗ Failed to send notification");
                }
            }
        }
    }

    /**
     * Process expired grace periods.
     */
    protected function processExpirations(bool $isDryRun): void
    {
        $this->info('Checking for expired grace periods...');
        
        $expiredSubscriptions = $this->gracePeriodService->getSubscriptionsWithExpiredGracePeriod();
        
        if ($expiredSubscriptions->isEmpty()) {
            $this->info('No subscriptions have expired grace periods at this time.');
            return;
        }

        $this->info("Found {$expiredSubscriptions->count()} subscriptions with expired grace periods:");
        
        foreach ($expiredSubscriptions as $subscription) {
            $this->line("  - Subscription #{$subscription->id} (Tenant: {$subscription->tenant_id})");
            $this->line("    Status: {$subscription->status}");
            
            try {
                $gracePeriodEnd = $this->gracePeriodService->calculateGracePeriodEndDate($subscription);
                $this->line("    Grace period ended: {$gracePeriodEnd->toDateTimeString()}");
            } catch (\Exception $e) {
                $this->error("    Error calculating grace period end: {$e->getMessage()}");
            }
            
            if (!$isDryRun) {
                try {
                    $expiredSubscription = $this->gracePeriodService->handleGracePeriodExpiration($subscription);
                    $this->info("    ✓ Subscription expired successfully (Status: {$expiredSubscription->status})");
                } catch (\Exception $e) {
                    $this->error("    ✗ Failed to expire subscription: {$e->getMessage()}");
                }
            }
        }
    }

    /**
     * Dispatch the grace period job to the queue.
     */
    protected function dispatchJob(): void
    {
        $this->info('Dispatching grace period job to queue...');
        
        GracePeriodJob::dispatch();
        
        $this->info('Grace period job dispatched successfully.');
    }
}