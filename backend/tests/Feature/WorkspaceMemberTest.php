<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class WorkspaceMemberTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $owner;
    protected User $admin;
    protected User $member;
    protected User $viewer;
    protected User $nonMember;
    protected Tenant $tenant;
    protected Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->owner = User::factory()->create();
        $this->admin = User::factory()->create();
        $this->member = User::factory()->create();
        $this->viewer = User::factory()->create();
        $this->nonMember = User::factory()->create();
        
        $this->tenant = Tenant::factory()->withOwner($this->owner)->create();
        $this->workspace = Workspace::factory()->forTenant($this->tenant)->create();
        
        // Add users to tenant
        $this->tenant->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->tenant->users()->attach($this->member->id, ['role' => 'member']);
        $this->tenant->users()->attach($this->viewer->id, ['role' => 'member']);
        
        // Add users to workspace with different roles
        $this->workspace->users()->attach($this->owner->id, ['role' => 'owner', 'joined_at' => now()]);
        $this->workspace->users()->attach($this->admin->id, ['role' => 'admin', 'joined_at' => now()]);
        $this->workspace->users()->attach($this->member->id, ['role' => 'member', 'joined_at' => now()]);
        $this->workspace->users()->attach($this->viewer->id, ['role' => 'viewer', 'joined_at' => now()]);
    }

    /**
     * Test listing workspace members.
     */
    public function test_listing_workspace_members(): void
    {
        $this->actingAs($this->member);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/members");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'members' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'role',
                        'status',
                        'joined_at',
                        'invited_by',
                    ]
                ],
                'pending_invitations_count',
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);

        $this->assertEquals(4, count($response->json('members')));
    }

    /**
     * Test non-members cannot view workspace members.
     */
    public function test_non_members_cannot_view_workspace_members(): void
    {
        $this->actingAs($this->nonMember);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/members");

        $response->assertStatus(403);
    }

    /**
     * Test updating member roles by owner.
     */
    public function test_updating_member_roles_by_owner(): void
    {
        $this->actingAs($this->owner);

        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->member->id}", [
            'role' => 'admin',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'member' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'status',
                    'joined_at',
                ],
            ]);

        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $this->member->id,
            'workspace_id' => $this->workspace->id,
            'role' => 'admin',
        ]);
    }

    /**
     * Test updating member roles by admin.
     */
    public function test_updating_member_roles_by_admin(): void
    {
        $this->actingAs($this->admin);

        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->viewer->id}", [
            'role' => 'member',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $this->viewer->id,
            'workspace_id' => $this->workspace->id,
            'role' => 'member',
        ]);
    }

    /**
     * Test preventing role escalation beyond current user's role.
     */
    public function test_preventing_role_escalation_beyond_current_user_role(): void
    {
        $this->actingAs($this->admin);

        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->member->id}", [
            'role' => 'owner',
        ]);

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'You cannot assign a role higher than your own',
            ]);
    }

    /**
     * Test preventing non-owners from modifying owner roles.
     */
    public function test_preventing_non_owners_from_modifying_owner_roles(): void
    {
        $this->actingAs($this->admin);

        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->owner->id}", [
            'role' => 'admin',
        ]);

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'Only owners can modify owner roles',
            ]);
    }

    /**
     * Test updating role of non-member returns error.
     */
    public function test_updating_role_of_non_member_returns_error(): void
    {
        $this->actingAs($this->owner);

        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->nonMember->id}", [
            'role' => 'member',
        ]);

        $response->assertStatus(404)
            ->assertJsonFragment([
                'message' => 'User is not a member of this workspace',
            ]);
    }

    /**
     * Test role validation rules.
     */
    public function test_role_validation_rules(): void
    {
        $this->actingAs($this->owner);

        // Test invalid role
        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->member->id}", [
            'role' => 'invalid-role',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // Test missing role
        $response = $this->putJson("/api/workspaces/{$this->workspace->id}/members/{$this->member->id}", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    /**
     * Test removing members by owner.
     */
    public function test_removing_members_by_owner(): void
    {
        $this->actingAs($this->owner);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->viewer->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Member removed successfully',
            ]);

        $this->assertDatabaseMissing('workspace_user', [
            'user_id' => $this->viewer->id,
            'workspace_id' => $this->workspace->id,
        ]);
    }

    /**
     * Test removing members by admin.
     */
    public function test_removing_members_by_admin(): void
    {
        $this->actingAs($this->admin);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->viewer->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('workspace_user', [
            'user_id' => $this->viewer->id,
            'workspace_id' => $this->workspace->id,
        ]);
    }

    /**
     * Test preventing non-owners from removing owners.
     */
    public function test_preventing_non_owners_from_removing_owners(): void
    {
        $this->actingAs($this->admin);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->owner->id}");

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'Only owners can remove other owners',
            ]);
    }

    /**
     * Test preventing removal of last owner.
     */
    public function test_preventing_removal_of_last_owner(): void
    {
        $this->actingAs($this->owner);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->owner->id}");

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'You cannot remove yourself as the last owner. Transfer ownership first.',
            ]);
    }

    /**
     * Test removing non-member returns error.
     */
    public function test_removing_non_member_returns_error(): void
    {
        $this->actingAs($this->owner);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/members/{$this->nonMember->id}");

        $response->assertStatus(404)
            ->assertJsonFragment([
                'message' => 'User is not a member of this workspace',
            ]);
    }

    /**
     * Test ownership transfer.
     */
    public function test_ownership_transfer(): void
    {
        $this->actingAs($this->owner);

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->admin->id}", [
            'confirm' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Ownership transferred successfully',
            ]);

        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $this->admin->id,
            'workspace_id' => $this->workspace->id,
            'role' => 'owner',
        ]);

        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $this->owner->id,
            'workspace_id' => $this->workspace->id,
            'role' => 'admin',
        ]);
    }

    /**
     * Test preventing ownership transfer by non-owners.
     */
    public function test_preventing_ownership_transfer_by_non_owners(): void
    {
        $this->actingAs($this->admin);

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->member->id}", [
            'confirm' => true,
        ]);

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'Only owners can transfer ownership',
            ]);
    }

    /**
     * Test preventing ownership transfer to non-members.
     */
    public function test_preventing_ownership_transfer_to_non_members(): void
    {
        $this->actingAs($this->owner);

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->nonMember->id}", [
            'confirm' => true,
        ]);

        $response->assertStatus(404)
            ->assertJsonFragment([
                'message' => 'User is not a member of this workspace',
            ]);
    }

    /**
     * Test preventing self-ownership transfer.
     */
    public function test_preventing_self_ownership_transfer(): void
    {
        $this->actingAs($this->owner);

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->owner->id}", [
            'confirm' => true,
        ]);

        $response->assertStatus(400)
            ->assertJsonFragment([
                'message' => 'You cannot transfer ownership to yourself',
            ]);
    }

    /**
     * Test ownership transfer validation.
     */
    public function test_ownership_transfer_validation(): void
    {
        $this->actingAs($this->owner);

        // Test missing confirmation
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->admin->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['confirm']);

        // Test false confirmation
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/transfer-ownership/{$this->admin->id}", [
            'confirm' => false,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['confirm']);
    }

    /**
     * Test getting user permissions for workspace.
     */
    public function test_getting_user_permissions_for_workspace(): void
    {
        $this->actingAs($this->admin);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'role',
                'permissions' => [
                    'view_workspace',
                    'view_boards',
                    'view_members',
                    'create_boards',
                    'manage_workspace',
                    'manage_members',
                    'manage_settings',
                    'view_analytics',
                    'invite_members',
                ],
            ]);

        $response->assertJsonFragment([
            'role' => 'admin',
            'manage_workspace' => true,
            'manage_members' => true,
            'transfer_ownership' => false,
        ]);
    }

    /**
     * Test permissions for different roles.
     */
    public function test_permissions_for_different_roles(): void
    {
        // Test owner permissions
        $this->actingAs($this->owner);
        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");
        $response->assertJsonFragment(['transfer_ownership' => true, 'delete_workspace' => true]);

        // Test admin permissions
        $this->actingAs($this->admin);
        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");
        $response->assertJsonFragment(['transfer_ownership' => false, 'delete_workspace' => false]);

        // Test member permissions
        $this->actingAs($this->member);
        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");
        $response->assertJsonFragment(['create_boards' => true, 'manage_members' => false]);

        // Test viewer permissions
        $this->actingAs($this->viewer);
        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");
        $response->assertJsonFragment(['create_boards' => false, 'view_boards' => true]);
    }

    /**
     * Test non-members cannot access permissions.
     */
    public function test_non_members_cannot_access_permissions(): void
    {
        $this->actingAs($this->nonMember);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/permissions");

        $response->assertStatus(403);
    }

    /**
     * Test members list includes pending invitations count.
     */
    public function test_members_list_includes_pending_invitations_count(): void
    {
        // Create some pending invitations
        Invitation::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'pending',
        ]);

        Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'accepted',
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/members");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'pending_invitations_count' => 3,
            ]);
    }

    /**
     * Test member list pagination.
     */
    public function test_member_list_pagination(): void
    {
        // Add more members to test pagination
        $additionalMembers = User::factory()->count(25)->create();
        foreach ($additionalMembers as $user) {
            $this->tenant->users()->attach($user->id, ['role' => 'member']);
            $this->workspace->users()->attach($user->id, ['role' => 'member', 'joined_at' => now()]);
        }

        $this->actingAs($this->member);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/members?per_page=10");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'members',
                'pending_invitations_count',
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);

        $this->assertEquals(10, count($response->json('members')));
        $this->assertEquals(1, $response->json('pagination.current_page'));
        $this->assertEquals(3, $response->json('pagination.last_page')); // 29 members total, 10 per page
    }
}