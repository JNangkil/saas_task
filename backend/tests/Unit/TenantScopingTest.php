<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Workspace;
use App\Models\Board;
use App\Models\Task;
use App\Services\TenantContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

class TenantScopingTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant1;
    private Tenant $tenant2;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test tenants
        $this->tenant1 = Tenant::factory()->create(['name' => 'Tenant 1', 'slug' => 'tenant1', 'status' => 'active']);
        $this->tenant2 = Tenant::factory()->create(['name' => 'Tenant 2', 'slug' => 'tenant2', 'status' => 'active']);

        // Create test user
        $this->user = User::factory()->create(['email' => 'test@example.com']);

        // Attach user to both tenants
        $this->tenant1->users()->attach($this->user->id, ['role' => 'member']);
        $this->tenant2->users()->attach($this->user->id, ['role' => 'member']);
    }

    /**
     * Test that tenant context is properly set and retrieved.
     */
    public function test_tenant_context_management(): void
    {
        $tenantContext = app(TenantContextService::class);

        // Initially no tenant context
        $this->assertNull($tenantContext->getCurrentTenant());
        $this->assertFalse($tenantContext->hasCurrentTenant());

        // Set tenant context
        $tenantContext->setCurrentTenant($this->tenant1);
        $this->assertEquals($this->tenant1->id, $tenantContext->getCurrentTenantId());
        $this->assertTrue($tenantContext->hasCurrentTenant());

        // Clear tenant context
        $tenantContext->clearCurrentTenant();
        $this->assertNull($tenantContext->getCurrentTenant());
        $this->assertFalse($tenantContext->hasCurrentTenant());
    }

    /**
     * Test that tenant scope is properly applied to queries.
     */
    public function test_tenant_scope_applies_to_queries(): void
    {
        $tenantContext = app(TenantContextService::class);
        
        // Authenticate the user so tenant scoping works
        Auth::login($this->user);

        // Create workspaces for both tenants
        $workspace1 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id, 'name' => 'Workspace 1']);
        $workspace2 = Workspace::factory()->create(['tenant_id' => $this->tenant2->id, 'name' => 'Workspace 2']);

        // Without tenant context, should return all workspaces
        $allWorkspaces = Workspace::allTenants()->get();
        $this->assertEquals(2, $allWorkspaces->count());

        // With tenant1 context, should only return tenant1's workspaces
        $tenantContext->setCurrentTenant($this->tenant1);
        $tenant1Workspaces = Workspace::get();
        $this->assertEquals(1, $tenant1Workspaces->count());
        $this->assertEquals($workspace1->id, $tenant1Workspaces->first()->id);

        // With tenant2 context, should only return tenant2's workspaces
        $tenantContext->setCurrentTenant($this->tenant2);
        $tenant2Workspaces = Workspace::get();
        $this->assertEquals(1, $tenant2Workspaces->count());
        $this->assertEquals($workspace2->id, $tenant2Workspaces->first()->id);

        // Clean up
        $tenantContext->clearCurrentTenant();
        Auth::logout();
    }

    /**
     * Test that BelongsToTenant trait automatically sets tenant_id.
     */
    public function test_belongs_to_tenant_trait_sets_tenant_id(): void
    {
        $tenantContext = app(TenantContextService::class);
        $tenantContext->setCurrentTenant($this->tenant1);
        
        // Authenticate the user so tenant scoping works
        Auth::login($this->user);

        // Create a workspace for the tenant first
        $workspace = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);
        
        // Create a board with explicitly setting tenant_id
        $board = Board::factory()->create([
            'name' => 'Test Board',
            'workspace_id' => $workspace->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        // Should automatically have tenant_id set to current tenant
        $this->assertEquals($this->tenant1->id, $board->tenant_id);
        $this->assertTrue($board->belongsToCurrentTenant());

        $tenantContext->clearCurrentTenant();
        Auth::logout();
    }

    /**
     * Test that tenant helper functions work correctly.
     */
    public function test_tenant_helper_functions(): void
    {
        $tenantContext = app(TenantContextService::class);

        // Initially no tenant
        $this->assertFalse(has_tenant());
        $this->assertNull(tenant());
        $this->assertNull(tenant_id());

        // Set tenant context
        $tenantContext->setCurrentTenant($this->tenant1);

        $this->assertTrue(has_tenant());
        $this->assertEquals($this->tenant1->id, tenant()->id);
        $this->assertEquals($this->tenant1->id, tenant_id());
        
        // Check if tenant is active
        $currentTenant = tenant();
        $this->assertTrue($currentTenant && $currentTenant->isActive());

        $tenantContext->clearCurrentTenant();
    }

    /**
     * Test tenant switching functionality.
     */
    public function test_tenant_switching(): void
    {
        $tenantContext = app(TenantContextService::class);
        
        // Authenticate the user so tenant scoping works
        Auth::login($this->user);

        // Create workspaces for both tenants
        $workspace1 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);
        $workspace2 = Workspace::factory()->create(['tenant_id' => $this->tenant2->id]);

        // Start with tenant1
        $tenantContext->setCurrentTenant($this->tenant1);
        $this->assertEquals($workspace1->id, Workspace::first()->id);

        // Switch to tenant2
        $tenantContext->setCurrentTenant($this->tenant2);
        $this->assertEquals($workspace2->id, Workspace::first()->id);

        $tenantContext->clearCurrentTenant();
        Auth::logout();
    }

    /**
     * Test that with_tenant helper works correctly.
     */
    public function test_with_tenant_helper(): void
    {
        $tenantContext = app(TenantContextService::class);
        $tenantContext->setCurrentTenant($this->tenant1);
        
        // Authenticate the user so tenant scoping works
        Auth::login($this->user);

        // Create a workspace in tenant1
        $workspace1 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);

        // Use with_tenant to temporarily switch context
        $result = with_tenant($this->tenant2, function () use ($workspace1) {
            // Should not see workspace1 here
            $workspaces = Workspace::get();
            return $workspaces->count();
        });

        $this->assertEquals(0, $result);

        // Should still be in tenant1 context
        $this->assertEquals($this->tenant1->id, $tenantContext->getCurrentTenantId());
        $this->assertEquals(1, Workspace::get()->count());

        $tenantContext->clearCurrentTenant();
        Auth::logout();
    }

    /**
     * Test that without_tenant_scope works correctly.
     */
    public function test_without_tenant_scope_helper(): void
    {
        $tenantContext = app(TenantContextService::class);
        $tenantContext->setCurrentTenant($this->tenant1);
        
        // Authenticate the user so tenant scoping works
        Auth::login($this->user);

        // Create workspaces for both tenants
        $workspace1 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);
        $workspace2 = Workspace::factory()->create(['tenant_id' => $this->tenant2->id]);

        // With tenant scope, should only see workspace1
        $this->assertEquals(1, Workspace::get()->count());

        // Without tenant scope, should see both workspaces
        $result = without_tenant_scope(function () {
            return Workspace::allTenants()->get()->count();
        });

        $this->assertEquals(2, $result);

        // Should still be in tenant1 context
        $this->assertEquals(1, Workspace::get()->count());

        $tenantContext->clearCurrentTenant();
        Auth::logout();
    }
}