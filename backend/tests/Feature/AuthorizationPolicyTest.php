<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class AuthorizationPolicyTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $owner;
    protected User $admin;
    protected User $member;
    protected User $viewer;
    protected User $foreignUser;
    protected Tenant $tenant;
    protected Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create users with different roles
        $this->owner = User::factory()->create();
        $this->admin = User::factory()->create();
        $this->member = User::factory()->create();
        $this->viewer = User::factory()->create();
        $this->foreignUser = User::factory()->create();
        
        // Create tenant with owner
        $this->tenant = Tenant::factory()->withOwner($this->owner)->create();
        
        // Add users to tenant with different roles
        $this->tenant->users()->attach($this->admin, ['role' => 'admin', 'joined_at' => now()]);
        $this->tenant->users()->attach($this->member, ['role' => 'member', 'joined_at' => now()]);
        $this->tenant->users()->attach($this->viewer, ['role' => 'member', 'joined_at' => now()]);
        
        // Create workspace
        $this->workspace = Workspace::factory()->forTenant($this->tenant)->create();
        
        // Add users to workspace with different roles
        $this->workspace->users()->attach($this->admin, ['role' => 'admin', 'joined_at' => now()]);
        $this->workspace->users()->attach($this->member, ['role' => 'member', 'joined_at' => now()]);
        $this->workspace->users()->attach($this->viewer, ['role' => 'viewer', 'joined_at' => now()]);
    }

    /**
     * Test tenant owner can manage tenant.
     */
    public function test_tenant_owner_can_manage_tenant(): void
    {
        $this->assertTrue($this->tenant->canUserManage($this->owner));
        $this->actingAs($this->owner)
            ->getJson("/api/tenants/{$this->tenant->id}")
            ->assertStatus(200);
    }

    /**
     * Test tenant admin can manage tenant.
     */
    public function test_tenant_admin_can_manage_tenant(): void
    {
        $this->assertTrue($this->tenant->canUserManage($this->admin));
        $this->actingAs($this->admin)
            ->getJson("/api/tenants/{$this->tenant->id}")
            ->assertStatus(200);
    }

    /**
     * Test tenant member cannot manage tenant.
     */
    public function test_tenant_member_cannot_manage_tenant(): void
    {
        $this->assertFalse($this->tenant->canUserManage($this->member));
        $this->actingAs($this->member)
            ->putJson("/api/tenants/{$this->tenant->id}", ['name' => 'Updated'])
            ->assertStatus(403);
    }

    /**
     * Test tenant viewer cannot manage tenant.
     */
    public function test_tenant_viewer_cannot_manage_tenant(): void
    {
        $this->assertFalse($this->tenant->canUserManage($this->viewer));
        $this->actingAs($this->viewer)
            ->putJson("/api/tenants/{$this->tenant->id}", ['name' => 'Updated'])
            ->assertStatus(403);
    }

    /**
     * Test workspace admin can manage workspace.
     */
    public function test_workspace_admin_can_manage_workspace(): void
    {
        $this->assertTrue($this->workspace->canUserManage($this->admin));
        $this->actingAs($this->admin)
            ->putJson("/api/workspaces/{$this->workspace->id}", ['name' => 'Updated'])
            ->assertStatus(200);
    }

    /**
     * Test workspace member can create boards.
     */
    public function test_workspace_member_can_create_boards(): void
    {
        $this->assertTrue($this->workspace->canUserCreateBoards($this->member));
        $this->actingAs($this->member)
            ->postJson("/api/workspaces/{$this->workspace->id}/boards", ['name' => 'New Board'])
            ->assertStatus(200); // Assuming boards endpoint exists
    }

    /**
     * Test workspace viewer can view workspace.
     */
    public function test_workspace_viewer_can_view_workspace(): void
    {
        $this->assertTrue($this->workspace->canUserView($this->viewer));
        $this->actingAs($this->viewer)
            ->getJson("/api/workspaces/{$this->workspace->id}")
            ->assertStatus(200);
    }

    /**
     * Test workspace viewer cannot manage workspace.
     */
    public function test_workspace_viewer_cannot_manage_workspace(): void
    {
        $this->assertFalse($this->workspace->canUserManage($this->viewer));
        $this->actingAs($this->viewer)
            ->putJson("/api/workspaces/{$this->workspace->id}", ['name' => 'Updated'])
            ->assertStatus(403);
    }

    /**
     * Test foreign user cannot access tenant.
     */
    public function test_foreign_user_cannot_access_tenant(): void
    {
        $this->assertFalse($this->tenant->users()->where('users.id', $this->foreignUser->id)->exists());
        $this->actingAs($this->foreignUser)
            ->getJson("/api/tenants/{$this->tenant->id}")
            ->assertStatus(403);
    }

    /**
     * Test foreign user cannot access workspace.
     */
    public function test_foreign_user_cannot_access_workspace(): void
    {
        $this->assertFalse($this->workspace->users()->where('users.id', $this->foreignUser->id)->exists());
        $this->actingAs($this->foreignUser)
            ->getJson("/api/workspaces/{$this->workspace->id}")
            ->assertStatus(403);
    }

    /**
     * Test user cannot have multiple roles in same tenant.
     */
    public function test_user_cannot_have_multiple_roles_in_same_tenant(): void
    {
        // Try to add the same user with a different role
        $this->actingAs($this->owner)
            ->postJson("/api/tenants/{$this->tenant->id}/members", [
                'email' => $this->admin->email,
                'role' => 'member'
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'User is already a member of this tenant'
            ]);
    }

    /**
     * Test workspace admin cannot remove last admin.
     */
    public function test_workspace_admin_cannot_remove_last_admin(): void
    {
        // Remove all other admins first
        $this->workspace->users()->wherePivot('role', 'admin')->where('users.id', '!=', $this->admin->id)->detach();
        
        // Now try to remove the last admin
        $this->actingAs($this->admin)
            ->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->admin->id}")
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Cannot remove the last admin from the workspace'
            ]);
    }

    /**
     * Test tenant owner cannot be removed from tenant.
     */
    public function test_tenant_owner_cannot_be_removed(): void
    {
        $this->actingAs($this->admin)
            ->deleteJson("/api/tenants/{$this->tenant->id}/members/{$this->owner->id}")
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Cannot remove the tenant owner'
            ]);
    }

    /**
     * Test workspace member cannot be added to workspace without tenant membership.
     */
    public function test_workspace_member_cannot_be_added_without_tenant_membership(): void
    {
        $newUser = User::factory()->create();
        
        $this->actingAs($this->admin)
            ->postJson("/api/workspaces/{$this->workspace->id}/members", [
                'email' => $newUser->email,
                'role' => 'member'
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'User does not belong to this tenant'
            ]);
    }

    /**
     * Test policy gates work correctly.
     */
    public function test_policy_gates_work_correctly(): void
    {
        // Test tenant-member gate
        $this->assertTrue($this->actingAs($this->owner)->can('tenant-member', $this->tenant));
        $this->assertFalse($this->actingAs($this->foreignUser)->can('tenant-member', $this->tenant));
        
        // Test workspace-member gate
        $this->assertTrue($this->actingAs($this->member)->can('workspace-member', $this->workspace));
        $this->assertFalse($this->actingAs($this->foreignUser)->can('workspace-member', $this->workspace));
        
        // Test manage-tenant gate
        $this->assertTrue($this->actingAs($this->owner)->can('manage-tenant', $this->tenant));
        $this->assertFalse($this->actingAs($this->member)->can('manage-tenant', $this->tenant));
        
        // Test manage-workspace gate
        $this->assertTrue($this->actingAs($this->admin)->can('manage-workspace', $this->workspace));
        $this->assertFalse($this->actingAs($this->viewer)->can('manage-workspace', $this->workspace));
    }
}