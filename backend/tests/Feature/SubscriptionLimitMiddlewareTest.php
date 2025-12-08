<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Illuminate\Http\UploadedFile;

class SubscriptionLimitMiddlewareTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private Tenant $tenant;
    private User $user;
    private Plan $plan;
    private Subscription $subscription;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test data
        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create();
        $this->tenant->users()->attach($this->user->id, ['role' => 'owner']);

        // Create a plan with limits
        $this->plan = Plan::factory()->create([
            'limits' => [
                'max_users' => 5,
                'max_workspaces' => 3,
                'max_storage_mb' => 100,
            ],
            'features' => ['analytics', 'api_access'],
        ]);

        // Create an active subscription
        $this->subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        // Set the current tenant in the app container
        app()->instance('current_tenant', $this->tenant);
    }

    /** @test */
    public function it_allows_requests_when_subscription_limits_are_disabled()
    {
        Config::set('billing.limits.enabled', false);

        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'Test Workspace',
            ]);

        // Since we don't have a real workspace endpoint, we expect a 404
        // but the middleware should not block it
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_blocks_requests_when_tenant_has_no_subscription()
    {
        // Delete the subscription
        $this->subscription->delete();

        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'Test Workspace',
            ]);

        $response->assertStatus(402)
            ->assertJson([
                'error' => 'Subscription Required',
            ]);
    }

    /** @test */
    public function it_blocks_requests_when_subscription_is_invalid()
    {
        // Update subscription to expired
        $this->subscription->update([
            'status' => Subscription::STATUS_EXPIRED,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'Test Workspace',
            ]);

        $response->assertStatus(402)
            ->assertJson([
                'error' => 'Subscription Invalid',
            ]);
    }

    /** @test */
    public function it_allows_requests_within_grace_period()
    {
        // Update subscription to canceled with future end date
        $this->subscription->update([
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->addDays(3),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'Test Workspace',
            ]);

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_blocks_user_creation_when_user_limit_is_exceeded()
    {
        // Create users to reach the limit
        for ($i = 0; $i < 4; $i++) {
            $user = User::factory()->create();
            $this->tenant->users()->attach($user->id, ['role' => 'member']);
        }

        // Now we have 5 users (1 owner + 4 members), which is the limit
        $this->assertEquals(5, $this->tenant->users()->count());

        $response = $this->actingAs($this->user)
            ->postJson('/api/users', [
                'name' => 'New User',
                'email' => 'newuser@example.com',
                'password' => 'password',
            ]);

        $response->assertStatus(402)
            ->assertJson([
                'error' => 'User Limit Exceeded',
            ]);
    }

    /** @test */
    public function it_blocks_workspace_creation_when_workspace_limit_is_exceeded()
    {
        // Create workspaces to reach the limit
        for ($i = 0; $i < 3; $i++) {
            $this->tenant->workspaces()->create([
                'name' => "Workspace {$i}",
                'slug' => "workspace-{$i}",
            ]);
        }

        // Now we have 3 workspaces, which is the limit
        $this->assertEquals(3, $this->tenant->workspaces()->count());

        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'New Workspace',
            ]);

        $response->assertStatus(402)
            ->assertJson([
                'error' => 'Workspace Limit Exceeded',
            ]);
    }

    /** @test */
    public function it_blocks_file_upload_when_storage_limit_is_exceeded()
    {
        // Mock storage to simulate used space
        Storage::fake('public');
        
        // Create a file that would exceed the limit
        $file = UploadedFile::fake()->create('document.pdf', 50 * 1024); // 50MB
        
        // Mock the storage usage calculation
        Config::set('billing.limits.storage.disk', 'public');
        
        // Create some existing files to use up storage
        $existingFile = UploadedFile::fake()->create('existing.pdf', 60 * 1024); // 60MB
        Storage::disk('public')->putFileAs(
            'tenant_' . $this->tenant->id,
            $existingFile,
            'existing.pdf'
        );

        $response = $this->actingAs($this->user)
            ->postJson('/api/upload', [
                'file' => $file,
            ]);

        $response->assertStatus(402)
            ->assertJson([
                'error' => 'Storage Limit Exceeded',
            ]);
    }

    /** @test */
    public function it_blocks_access_to_restricted_features()
    {
        // Configure feature mappings
        Config::set('billing.limits.feature_mappings', [
            'analytics' => ['analytics.*', 'reports.*'],
        ]);

        // Create a plan without analytics feature
        $planWithoutAnalytics = Plan::factory()->create([
            'limits' => [
                'max_users' => 5,
                'max_workspaces' => 3,
                'max_storage_mb' => 100,
            ],
            'features' => ['api_access'], // No analytics
        ]);

        // Update subscription to use this plan
        $this->subscription->update([
            'plan_id' => $planWithoutAnalytics->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/analytics/dashboard');

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'Feature Not Available',
            ]);
    }

    /** @test */
    public function it_bypasses_checks_for_read_only_operations()
    {
        Config::set('billing.limits.bypass.read_only_operations', true);

        // Create users to reach the limit
        for ($i = 0; $i < 4; $i++) {
            $user = User::factory()->create();
            $this->tenant->users()->attach($user->id, ['role' => 'member']);
        }

        // Even though we're at the user limit, GET requests should be allowed
        $response = $this->actingAs($this->user)
            ->getJson('/api/users');

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_bypasses_checks_for_configured_routes()
    {
        Config::set('billing.limits.bypass.routes', [
            'billing.*',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/billing/plans');

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_bypasses_checks_for_configured_paths()
    {
        Config::set('billing.limits.bypass.paths', [
            'health',
            'webhooks/*',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/health');

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_handles_requests_without_tenant()
    {
        // Remove tenant from app container
        app()->instance('current_tenant', null);

        $response = $this->actingAs($this->user)
            ->getJson('/api/test');

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_allows_requests_when_limits_are_not_exceeded()
    {
        // All limits should be within bounds
        $response = $this->actingAs($this->user)
            ->postJson('/api/workspaces', [
                'name' => 'Test Workspace',
            ]);

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }

    /** @test */
    public function it_handles_unlimited_limits()
    {
        // Create a plan with unlimited limits
        $unlimitedPlan = Plan::factory()->create([
            'limits' => [
                'max_users' => 0, // 0 means unlimited
                'max_workspaces' => 0,
                'max_storage_mb' => 0,
            ],
            'features' => ['analytics', 'api_access'],
        ]);

        // Update subscription to use this plan
        $this->subscription->update([
            'plan_id' => $unlimitedPlan->id,
        ]);

        // Create many users to test unlimited limit
        for ($i = 0; $i < 10; $i++) {
            $user = User::factory()->create();
            $this->tenant->users()->attach($user->id, ['role' => 'member']);
        }

        $response = $this->actingAs($this->user)
            ->postJson('/api/users', [
                'name' => 'Another User',
                'email' => 'another@example.com',
                'password' => 'password',
            ]);

        // Should not be blocked by middleware
        $this->assertNotEquals(402, $response->status());
        $this->assertNotEquals(403, $response->status());
    }
}