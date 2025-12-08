<?php

namespace App\Console\Commands;

use Database\Seeders\SubscriptionBillingSeeder;
use App\Models\Tenant;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MigrateSubscriptionBilling extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:migrate 
                            {--dry-run : Preview changes without applying them}
                            {--force : Force re-run even if migration was already completed}
                            {--tenant-id= : Process only a specific tenant ID}
                            {--batch-size=100 : Number of tenants to process in each batch}
                            {--skip-stripe : Skip Stripe customer creation}
                            {--rollback : Rollback previous migration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing tenants to subscription billing system';

    /**
     * The seeder instance.
     */
    protected SubscriptionBillingSeeder $seeder;

    /**
     * Migration statistics.
     */
    protected array $stats = [
        'tenants_processed' => 0,
        'subscriptions_created' => 0,
        'stripe_customers_created' => 0,
        'errors' => 0,
        'skipped' => 0,
    ];

    /**
     * Create a new command instance.
     */
    public function __construct()
    {
        parent::__construct();
        $this->seeder = new SubscriptionBillingSeeder();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $isRollback = $this->option('rollback');
        $tenantId = $this->option('tenant-id');
        $batchSize = (int) $this->option('batch-size');

        $this->info($isRollback ? 'Starting subscription billing rollback...' : 'Starting subscription billing migration...');
        
        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No changes will be applied');
        }

        // Validate options
        $validator = Validator::make([
            'batch_size' => $batchSize,
            'tenant_id' => $tenantId,
        ], [
            'batch_size' => 'required|integer|min:1|max:1000',
            'tenant_id' => 'nullable|integer|exists:tenants,id',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return Command::FAILURE;
        }

        try {
            if ($isRollback) {
                return $this->performRollback($isDryRun);
            } else {
                return $this->performMigration($isDryRun, $tenantId, $batchSize);
            }
        } catch (\Exception $e) {
            $this->error('Migration failed: ' . $e->getMessage());
            Log::error('Subscription billing migration command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Perform the migration.
     */
    protected function performMigration(bool $isDryRun, ?int $tenantId, int $batchSize): int
    {
        // Check if migration was already completed
        if (!$this->option('force') && $this->isMigrationCompleted()) {
            $this->warn('Migration appears to be already completed. Use --force to re-run.');
            $this->info('To check current status, run: php artisan billing:migrate --dry-run');
            return Command::SUCCESS;
        }

        // Create default plans first (outside of transaction for visibility)
        if (!$isDryRun) {
            $this->seeder->command = $this;
            $this->seeder->createDefaultPlans();
        } else {
            $this->info('DRY RUN: Would create default subscription plans');
        }

        // Get tenants to process
        $query = Tenant::with(['users', 'workspaces']);
        
        if ($tenantId) {
            $query->where('id', $tenantId);
            $this->info("Processing only tenant ID: {$tenantId}");
        }

        $totalTenants = $query->count();
        
        if ($totalTenants === 0) {
            $this->info('No tenants found to process.');
            return Command::SUCCESS;
        }

        $this->info("Found {$totalTenants} tenants to process");

        // Process tenants in batches
        $this->processTenantsInBatches($query, $batchSize, $isDryRun);

        // Display summary
        $this->displaySummary($isDryRun);

        // Log completion
        $this->logMigrationCompletion();

        $this->info($isDryRun ? 'Dry run completed successfully!' : 'Migration completed successfully!');
        return Command::SUCCESS;
    }

    /**
     * Process tenants in batches.
     */
    protected function processTenantsInBatches($query, int $batchSize, bool $isDryRun): void
    {
        $progressBar = $this->output->createProgressBar($query->count());
        $progressBar->start();

        $query->chunk($batchSize, function ($tenants) use ($isDryRun, $progressBar) {
            foreach ($tenants as $tenant) {
                $this->processTenant($tenant, $isDryRun);
                $progressBar->advance();
            }
        });

        $progressBar->finish();
        $this->line('');
    }

    /**
     * Process a single tenant.
     */
    protected function processTenant(Tenant $tenant, bool $isDryRun): void
    {
        try {
            // Skip if tenant already has a subscription (unless forced)
            if ($tenant->subscriptions()->exists() && !$this->option('force')) {
                $this->line("  ⚠ Skipping tenant '{$tenant->name}' - already has subscription");
                $this->stats['skipped']++;
                return;
            }

            $this->stats['tenants_processed']++;

            if (!$isDryRun) {
                DB::transaction(function () use ($tenant) {
                    $this->seeder->migrateExistingTenants();
                    $this->stats['subscriptions_created']++;
                    
                    if (!$this->option('skip-stripe')) {
                        $this->seeder->createStripeCustomerForTenant($tenant);
                        $this->stats['stripe_customers_created']++;
                    }
                });
            } else {
                // Dry run - just show what would happen
                $this->line("  ✓ Would process tenant '{$tenant->name}' ({$tenant->users->count()} users, {$tenant->workspaces->count()} workspaces)");
                $this->stats['subscriptions_created']++;
                
                if (!$this->option('skip-stripe') && !$tenant->stripe_customer_id) {
                    $this->stats['stripe_customers_created']++;
                }
            }
        } catch (\Exception $e) {
            $this->line("  ✗ Error processing tenant '{$tenant->name}': {$e->getMessage()}");
            $this->stats['errors']++;
            Log::error('Error processing tenant during migration', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Perform rollback.
     */
    protected function performRollback(bool $isDryRun): int
    {
        if ($isDryRun) {
            $this->info('DRY RUN: Would delete subscriptions created by migration');
            
            $count = Subscription::where('metadata->migration_source', 'seeder')->count();
            $this->info("Would delete {$count} subscriptions");
            
            return Command::SUCCESS;
        }

        $this->seeder->command = $this;
        $this->seeder->rollback();
        
        return Command::SUCCESS;
    }

    /**
     * Check if migration was already completed.
     */
    protected function isMigrationCompleted(): bool
    {
        // Check if we have subscriptions created by migration
        $migrationSubscriptions = Subscription::where('metadata->migration_source', 'seeder')->count();
        
        // Check if all tenants have subscriptions
        $totalTenants = Tenant::count();
        $tenantsWithSubscriptions = Tenant::whereHas('subscriptions')->count();
        
        return $migrationSubscriptions > 0 && $tenantsWithSubscriptions >= $totalTenants;
    }

    /**
     * Display migration summary.
     */
    protected function displaySummary(bool $isDryRun): void
    {
        $this->newLine();
        $this->info('=== Migration Summary ===');
        
        if ($isDryRun) {
            $this->info('This is a DRY RUN - no changes were actually made');
        }
        
        $this->line("Tenants processed: {$this->stats['tenants_processed']}");
        $this->line("Subscriptions created: {$this->stats['subscriptions_created']}");
        $this->line("Stripe customers created: {$this->stats['stripe_customers_created']}");
        $this->line("Errors: {$this->stats['errors']}");
        $this->line("Skipped: {$this->stats['skipped']}");
        
        if ($this->stats['errors'] > 0) {
            $this->warn('Some errors occurred during migration. Check the logs for details.');
        }
    }

    /**
     * Log migration completion.
     */
    protected function logMigrationCompletion(): void
    {
        Log::info('Subscription billing migration completed', [
            'stats' => $this->stats,
            'dry_run' => $this->option('dry-run'),
            'user' => get_current_user(),
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Get migration status.
     */
    protected function getMigrationStatus(): array
    {
        $totalTenants = Tenant::count();
        $tenantsWithSubscriptions = Tenant::whereHas('subscriptions')->count();
        $tenantsWithStripeCustomers = Tenant::whereNotNull('stripe_customer_id')->count();
        $migrationSubscriptions = Subscription::where('metadata->migration_source', 'seeder')->count();

        return [
            'total_tenants' => $totalTenants,
            'tenants_with_subscriptions' => $tenantsWithSubscriptions,
            'tenants_with_stripe_customers' => $tenantsWithStripeCustomers,
            'migration_subscriptions' => $migrationSubscriptions,
            'migration_complete' => $tenantsWithSubscriptions >= $totalTenants,
        ];
    }
}