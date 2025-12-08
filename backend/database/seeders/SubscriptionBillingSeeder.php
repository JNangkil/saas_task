<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\BillingProviders\BillingProviderFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SubscriptionBillingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Starting subscription billing migration...');
        
        DB::transaction(function () {
            $this->createDefaultPlans();
            $this->migrateExistingTenants();
        });
        
        $this->command->info('Subscription billing migration completed successfully!');
    }
    
    /**
     * Create default subscription plans.
     */
    protected function createDefaultPlans(): void
    {
        $this->command->info('Creating default subscription plans...');
        
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price' => 0.00,
                'billing_interval' => 'month',
                'trial_days' => 0,
                'is_popular' => false,
                'limits' => [
                    'max_users' => 3,
                    'max_workspaces' => 1,
                    'max_boards' => 5,
                    'max_storage_mb' => 100,
                ],
                'features' => [
                    'basic_features',
                    'email_support',
                ],
                'metadata' => [
                    'tier' => 'free',
                    'description' => 'Perfect for small teams getting started',
                ],
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price' => 19.99,
                'billing_interval' => 'month',
                'trial_days' => 14,
                'is_popular' => false,
                'limits' => [
                    'max_users' => 10,
                    'max_workspaces' => 3,
                    'max_boards' => 20,
                    'max_storage_mb' => 1000,
                ],
                'features' => [
                    'basic_features',
                    'email_support',
                    'api_access',
                    'basic_integrations',
                ],
                'metadata' => [
                    'tier' => 'starter',
                    'description' => 'Great for growing teams',
                ],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 49.99,
                'billing_interval' => 'month',
                'trial_days' => 14,
                'is_popular' => true,
                'limits' => [
                    'max_users' => 50,
                    'max_workspaces' => 10,
                    'max_boards' => 100,
                    'max_storage_mb' => 10000,
                ],
                'features' => [
                    'basic_features',
                    'priority_support',
                    'api_access',
                    'advanced_integrations',
                    'advanced_permissions',
                    'analytics',
                ],
                'metadata' => [
                    'tier' => 'pro',
                    'description' => 'Advanced features for professional teams',
                ],
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 199.99,
                'billing_interval' => 'month',
                'trial_days' => 30,
                'is_popular' => false,
                'limits' => [
                    'max_users' => -1, // Unlimited
                    'max_workspaces' => -1, // Unlimited
                    'max_boards' => -1, // Unlimited
                    'max_storage_mb' => -1, // Unlimited
                ],
                'features' => [
                    'basic_features',
                    'priority_support',
                    'api_access',
                    'advanced_integrations',
                    'advanced_permissions',
                    'analytics',
                    'custom_themes',
                    'dedicated_support',
                    'sla_guarantee',
                ],
                'metadata' => [
                    'tier' => 'enterprise',
                    'description' => 'Custom solution for large organizations',
                ],
            ],
        ];
        
        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
            
            $this->command->line("  ✓ Created/Updated plan: {$planData['name']}");
        }
    }
    
    /**
     * Migrate existing tenants to appropriate subscriptions.
     */
    protected function migrateExistingTenants(): void
    {
        $this->command->info('Migrating existing tenants...');
        
        $tenants = Tenant::all();
        $freePlan = Plan::where('slug', 'free')->first();
        $proPlan = Plan::where('slug', 'pro')->first();
        
        if (!$freePlan || !$proPlan) {
            $this->command->error('Default plans not found. Please run createDefaultPlans() first.');
            return;
        }
        
        $migratedCount = 0;
        $skippedCount = 0;
        
        foreach ($tenants as $tenant) {
            // Skip if tenant already has a subscription
            if ($tenant->subscriptions()->exists()) {
                $this->command->line("  ⚠ Skipping tenant '{$tenant->name}' - already has subscription");
                $skippedCount++;
                continue;
            }
            
            // Determine tenant type based on creation date and other factors
            $isNewTenant = $tenant->created_at->greaterThan(Carbon::now()->subDays(30));
            $shouldGetTrial = $isNewTenant || $this->shouldGrandfatherTrial($tenant);
            
            if ($shouldGetTrial) {
                // New tenants get 14-day trial of Pro plan
                $this->createSubscriptionForTenant($tenant, $proPlan, [
                    'status' => Subscription::STATUS_TRIALING,
                    'trial_ends_at' => Carbon::now()->addDays(14),
                    'metadata' => [
                        'migration_source' => 'seeder',
                        'trial_granted_reason' => $isNewTenant ? 'new_tenant' : 'grandfathered',
                    ],
                ]);
                
                $this->command->line("  ✓ Created Pro trial subscription for tenant '{$tenant->name}'");
            } else {
                // Existing tenants get Free plan by default
                $this->createSubscriptionForTenant($tenant, $freePlan, [
                    'status' => Subscription::STATUS_ACTIVE,
                    'metadata' => [
                        'migration_source' => 'seeder',
                        'plan_assignment_reason' => 'existing_tenant_default',
                    ],
                ]);
                
                $this->command->line("  ✓ Created Free subscription for tenant '{$tenant->name}'");
            }
            
            // Create Stripe customer if not exists
            $this->createStripeCustomerForTenant($tenant);
            
            $migratedCount++;
        }
        
        $this->command->info("Migration summary: {$migratedCount} tenants migrated, {$skippedCount} tenants skipped");
    }
    
    /**
     * Create a subscription for a tenant.
     */
    protected function createSubscriptionForTenant(Tenant $tenant, Plan $plan, array $overrides = []): Subscription
    {
        $subscriptionData = array_merge([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'trial_ends_at' => null,
            'ends_at' => null,
            'metadata' => [],
        ], $overrides);
        
        $subscription = Subscription::create($subscriptionData);
        
        Log::info('Created subscription during migration', [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'subscription_id' => $subscription->id,
            'status' => $subscription->status,
        ]);
        
        return $subscription;
    }
    
    /**
     * Create a Stripe customer for a tenant if not exists.
     */
    protected function createStripeCustomerForTenant(Tenant $tenant): void
    {
        if ($tenant->stripe_customer_id) {
            return; // Customer already exists
        }
        
        try {
            $billingProvider = BillingProviderFactory::make();
            $customer = $billingProvider->createCustomer($tenant, []);
            
            $tenant->update(['stripe_customer_id' => $customer['id']]);
            
            Log::info('Created Stripe customer during migration', [
                'tenant_id' => $tenant->id,
                'stripe_customer_id' => $customer['id'],
            ]);
            
            $this->command->line("    ✓ Created Stripe customer for tenant '{$tenant->name}'");
        } catch (\Exception $e) {
            Log::error('Failed to create Stripe customer during migration', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            
            $this->command->error("    ✗ Failed to create Stripe customer for tenant '{$tenant->name}': {$e->getMessage()}");
        }
    }
    
    /**
     * Determine if a tenant should be grandfathered into a trial.
     */
    protected function shouldGrandfatherTrial(Tenant $tenant): bool
    {
        // Add logic here to determine if an existing tenant should get a trial
        // For example, based on their current usage, activity level, etc.
        
        // For now, we'll give trials to tenants with more than 5 users
        $userCount = $tenant->users()->count();
        
        if ($userCount > 5) {
            return true;
        }
        
        // Or tenants with more than 2 workspaces
        $workspaceCount = $tenant->workspaces()->count();
        
        if ($workspaceCount > 2) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Rollback the migration.
     */
    public function rollback(): void
    {
        $this->command->info('Rolling back subscription billing migration...');
        
        DB::transaction(function () {
            // Delete all subscriptions created by this seeder
            $deletedSubscriptions = Subscription::where('metadata->migration_source', 'seeder')->delete();
            $this->command->line("  ✓ Deleted {$deletedSubscriptions} subscriptions");
            
            // Note: We don't delete Stripe customers as they might be used elsewhere
            // We also don't delete plans as they might be referenced by other data
        });
        
        $this->command->info('Rollback completed successfully!');
    }
}