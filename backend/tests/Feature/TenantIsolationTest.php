<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user1;
    protected User $user2;
    protected Tenant $tenant1;
    protected Tenant $tenant2;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create two users
        $this->user1 = User::factory()->create();
        $this->user2 = User::factory()->create();
        
        // Create two tenants with different owners
        $this->tenant1 = Tenant::factory()->withOwner($this->user1)->create();
        $this->tenant2 = Tenant::factory()->withOwner($this->user2)->create();
    }

    /**
     * Test that users can only access their own tenants.
     */
    public function test_users_can_only_access_their_own_tenants(): void
    {
        // User1 should see tenant1 but not tenant2
        $response = $this->actingAs($this->user1)->getJson('/api/tenants');
        $response->assertStatus(200);
        
        $tenantIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->tenant1->id, $tenantIds);
        $this->assertNotContains($this->tenant2->id, $tenantIds);
        
        // User2 should see tenant2 but not tenant1
        $response = $this->actingAs($this->user2)->getJson('/api/tenants');
        $response->assertStatus(200);
        
        $tenantIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->tenant2->id, $tenantIds);
        $this->assertNotContains($this->tenant1->id, $tenantIds);
    }

    /**
     * Test that workspaces are isolated by tenant.
     */
    public function test_workspaces_are_isolated_by_tenant(): void
    {
        // Create workspaces in different tenants
        $workspace1 = Workspace::factory()->forTenant($this->tenant1)->withAdmin($this->user1)->create();
        $workspace2 = Workspace::factory()->forTenant($this->tenant2)->withAdmin($this->user2)->create();
        
        // User1 should only see workspace1
        $response = $this->actingAs($this->user1)
            ->getJson("/api/tenants/{$this->tenant1->id}/workspaces");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($workspace1->id, $workspaceIds);
        $this->assertNotContains($workspace2->id, $workspaceIds);
        
        // User2 should only see workspace2
        $response = $this->actingAs($this->user2)
            ->getJson("/api/tenants/{$this->tenant2->id}/workspaces");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($workspace2->id, $workspaceIds);
        $this->assertNotContains($workspace1->id, $workspaceIds);
    }

    /**
     * Test that boards are isolated by tenant through workspace scope.
     */
    public function test_boards_are_isolated_by_tenant(): void
    {
        // Create workspaces in different tenants
        $workspace1 = Workspace::factory()->forTenant($this->tenant1)->withAdmin($this->user1)->create();
        $workspace2 = Workspace::factory()->forTenant($this->tenant2)->withAdmin($this->user2)->create();
        
        // Create boards in different workspaces
        $board1 = Board::factory()->create([
            'tenant_id' => $this->tenant1->id,
            'workspace_id' => $workspace1->id,
        ]);
        
        $board2 = Board::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'workspace_id' => $workspace2->id,
        ]);
        
        // User1 should only see board1 when querying boards directly
        $response = $this->actingAs($this->user1)->getJson('/api/boards');
        $response->assertStatus(200);
        
        $boardIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($board1->id, $boardIds);
        $this->assertNotContains($board2->id, $boardIds);
        
        // User2 should only see board2 when querying boards directly
        $response = $this->actingAs($this->user2)->getJson('/api/boards');
        $response->assertStatus(200);
        
        $boardIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($board2->id, $boardIds);
        $this->assertNotContains($board1->id, $boardIds);
    }

    /**
     * Test that tenant scope prevents cross-tenant access.
     */
    public function test_tenant_scope_prevents_cross_tenant_access(): void
    {
        // Create a workspace in tenant1
        $workspace = Workspace::factory()->forTenant($this->tenant1)->withAdmin($this->user1)->create();
        
        // Try to access it as user2 with tenant2 context
        $response = $this->actingAs($this->user2)
            ->withHeader('X-Tenant-ID', $this->tenant2->id)
            ->getJson("/api/workspaces/{$workspace->id}");
        
        // Should be blocked by tenant scope or authorization
        $response->assertStatus(403);
    }

    /**
     * Test that users cannot access foreign tenant workspaces directly.
     */
    public function test_users_cannot_access_foreign_tenant_workspaces_directly(): void
    {
        // Create a workspace in tenant2
        $workspace = Workspace::factory()->forTenant($this->tenant2)->withAdmin($this->user2)->create();
        
        // Try to access it as user1
        $response = $this->actingAs($this->user1)
            ->getJson("/api/workspaces/{$workspace->id}");
        
        $response->assertStatus(403);
    }

    /**
     * Test that tenant isolation works with soft deletes.
     */
    public function test_tenant_isolation_works_with_soft_deletes(): void
    {
        // Create workspace in tenant1
        $workspace = Workspace::factory()->forTenant($this->tenant1)->withAdmin($this->user1)->create();
        
        // Delete it
        $workspace->delete();
        
        // User1 should not see deleted workspace
        $response = $this->actingAs($this->user1)
            ->getJson("/api/tenants/{$this->tenant1->id}/workspaces");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($workspace->id, $workspaceIds);
        
        // User2 should not see it either (even though they don't belong to tenant1)
        $response = $this->actingAs($this->user2)
            ->withHeader('X-Tenant-ID', $this->tenant1->id)
            ->getJson("/api/tenants/{$this->tenant1->id}/workspaces");
        
        $response->assertStatus(403); // Blocked by tenant resolution middleware
    }

    /**
     * Test that archived workspaces are properly isolated.
     */
    public function test_archived_workspaces_are_properly_isolated(): void
    {
        // Create workspaces in different tenants
        $workspace1 = Workspace::factory()->forTenant($this->tenant1)->withAdmin($this->user1)->create();
        $workspace2 = Workspace::factory()->forTenant($this->tenant2)->withAdmin($this->user2)->create();
        
        // Archive workspace1
        $workspace1->archive();
        
        // User1 should see archived workspace when requested
        $response = $this->actingAs($this->user1)
            ->getJson("/api/tenants/{$this->tenant1->id}/workspaces?include_archived=true");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($workspace1->id, $workspaceIds);
        
        // User1 should not see archived workspace when not requested
        $response = $this->actingAs($this->user1)
            ->getJson("/api/tenants/{$this->tenant1->id}/workspaces");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($workspace1->id, $workspaceIds);
        
        // User2 should never see workspace1
        $response = $this->actingAs($this->user2)
            ->getJson("/api/tenants/{$this->tenant2->id}/workspaces");
        
        $response->assertStatus(200);
        $workspaceIds = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($workspace1->id, $workspaceIds);
    }
}