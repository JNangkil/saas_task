<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CheckBillingMigration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:check-migration';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check if subscription billing migration is complete';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking subscription billing database structure...');
        $this->line('');

        // Check plans table for stripe_price_id
        $this->info('1. Checking plans table for stripe_price_id column...');
        if (Schema::hasColumn('plans', 'stripe_price_id')) {
            $this->line('   ✓ stripe_price_id column exists in plans table');
        } else {
            $this->error('   ✗ stripe_price_id column MISSING from plans table');
        }

        // Check subscriptions table for metadata column
        $this->line('');
        $this->info('2. Checking subscriptions table for metadata column...');
        if (Schema::hasColumn('subscriptions', 'metadata')) {
            $this->line('   ✓ metadata column exists in subscriptions table');
        } else {
            $this->error('   ✗ metadata column MISSING from subscriptions table');
        }

        // Check if subscription_events table exists
        $this->line('');
        $this->info('3. Checking if subscription_events table exists...');
        if (Schema::hasTable('subscription_events')) {
            $this->line('   ✓ subscription_events table exists');
            
            // Check if it has required columns
            $requiredColumns = ['id', 'subscription_id', 'type', 'data', 'processed_at', 'created_at', 'updated_at'];
            foreach ($requiredColumns as $column) {
                if (Schema::hasColumn('subscription_events', $column)) {
                    $this->line("   ✓ $column column exists");
                } else {
                    $this->error("   ✗ $column column MISSING");
                }
            }
        } else {
            $this->error('   ✗ subscription_events table MISSING');
        }

        // Check if processed_webhook_events table exists
        $this->line('');
        $this->info('4. Checking if processed_webhook_events table exists...');
        if (Schema::hasTable('processed_webhook_events')) {
            $this->line('   ✓ processed_webhook_events table exists');
        } else {
            $this->error('   ✗ processed_webhook_events table MISSING');
        }

        // Check if failed_webhook_events table exists
        $this->line('');
        $this->info('5. Checking if failed_webhook_events table exists...');
        if (Schema::hasTable('failed_webhook_events')) {
            $this->line('   ✓ failed_webhook_events table exists');
        } else {
            $this->error('   ✗ failed_webhook_events table MISSING');
        }

        $this->line('');
        $this->info('Database structure check completed.');
        
        return 0;
    }
}