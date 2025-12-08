<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->tenant = Tenant::factory()->withOwner($this->user)->create();
        $this->actingAs($this->user);
    }

    /**
     * Test user can create a workspace in their tenant.
     */
    public function test_user_can_create_workspace_in_their_tenant(): void
    {
        $workspaceData = [
            'name' => 'Test Workspace',
            'description' => 'A test workspace for testing',
            'color' => '#3B82F6',
            'icon' => '🏢',
        ];

        $response = $this->postJson("/api/tenants/{$this->tenant->id}/workspaces", $workspaceData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'tenant_id',
                    'name',
                    'description',
                    'color',
                    'icon',
                    'is_archived',
                    'is_default',
                    'created_at',
                    'updated_at',
                ]
            ]);

        $this->assertDatabaseHas('workspaces', [
            'name' => 'Test Workspace',
            'tenant_id' => $this->tenant->id,
        ]);

        // Check that user is attached as admin
        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);
    }

    /**
     * Test user cannot create workspace in foreign tenant.
     */
    public function test_user_cannot_create_workspace_in_foreign_tenant(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $workspaceData = [
            'name' => 'Test Workspace',
        ];

        $response = $this->postJson("/api/tenants/{$foreignTenant->id}/workspaces", $workspaceData);

        $response->assertStatus(403);
    }

    /**
     * Test user can view workspaces in their tenant.
     */
    public function test_user_can_view_workspaces_in_their_tenant(): void
    {
        $workspace = Workspace::factory()->forTenant($this->tenant)->withAdmin($this->user)->create();

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'tenant_id',
                        'name',
                        'user_role',
                    ]
                ]
            ]);

        $response->assertJsonFragment([
            'name' => $workspace->name,
            'user_role' => 'admin',
        ]);
    }

    /**
     * Test user cannot view workspaces in foreign tenant.
     */
    public function test_user_cannot_view_workspaces_in_foreign_tenant(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $response = $this->getJson("/api/tenants/{$foreignTenant->id}/workspaces");

        $response->assertStatus(403);
    }

    /**
     * Test user can view their workspace.
     */
    public function test_user_can_view_their_workspace(): void
    {
        $workspace = Workspace::factory()->forTenant($this->tenant)->withAdmin($this->user)->create();

        $response = $this->getJson("/api/workspaces/{$workspace->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'tenant_id',
                    'name',
                    'description',
                    'color',
                    'icon',
                    'is_archived',
                    'is_default',
                    'user_role',
                ]
            ]);

        $response->assertJsonFragment([
            'name' => $workspace->name,
            'user_role' => 'admin',
        ]);
    }

    /**
     * Test user cannot view foreign workspace.
     */
    public function test_user_cannot_view_foreign_workspace(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();
        $foreignWorkspace = Workspace::factory()->forTenant($foreignTenant)->withAdmin($otherUser)->create();

        $response = $this->getJson("/api/workspaces/{$foreignWorkspace->id}");

        $response->assertStatus(403);
    }

    /**
     * Test user can update their workspace.
     */
    public function test_user_can_update_their_workspace(): void
    {
        $workspace = Workspace::factory()->forTenant($this->tenant)->withAdmin($this->user)->create();

        $updateData = [
            'name' => 'Updated Workspace Name',
            'description' => 'Updated description',
            'color' => '#10B981',
        ];

        $response = $this->putJson("/api/workspaces/{$workspace->id}", $updateData);

        $response->assertStatus(200);

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'name' => 'Updated Workspace Name',
            'description' => 'Updated description',
            'color' => '#10B981',
        ]);
    }

    /**
     * Test user cannot update foreign workspace.
     */
    public function test_user_cannot_update_foreign_workspace(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();
        $foreignWorkspace = Workspace::factory()->forTenant($foreignTenant)->withAdmin($otherUser)->create();

        $updateData = [
            'name' => 'Hacked Workspace Name',
        ];

        $response = $this->putJson("/api/workspaces/{$foreignWorkspace->id}", $updateData);

        $response->assertStatus(403);
    }

    /**
     * Test user can archive their workspace.
     */
    public function test_user_can_archive_their_workspace(): void
    {
        $workspace = Workspace::factory()->forTenant($this->tenant)->withAdmin($this->user)->create();

        $response = $this->postJson("/api/workspaces/{$workspace->id}/archive");

        $response->assertStatus(200);

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'is_archived' => true,
        ]);
    }

    /**
     * Test user cannot archive foreign workspace.
     */
    public function test_user_cannot_archive_foreign_workspace(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();
        $foreignWorkspace = Workspace::factory()->forTenant($foreignTenant)->withAdmin($otherUser)->create();

        $response = $this->postJson("/api/workspaces/{$foreignWorkspace->id}/archive");

        $response->assertStatus(403);
    }

    /**
     * Test user can restore their workspace.
     */
    public function test_user_can_restore_their_workspace(): void
    {
        $workspace = Workspace::factory()
            ->forTenant($this->tenant)
            ->withAdmin($this->user)
            ->archived()
            ->create();

        $response = $this->postJson("/api/workspaces/{$workspace->id}/restore");

        $response->assertStatus(200);

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'is_archived' => false,
        ]);
    }

    /**
     * Test user cannot restore foreign workspace.
     */
    public function test_user_cannot_restore_foreign_workspace(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();
        $foreignWorkspace = Workspace::factory()
            ->forTenant($foreignTenant)
            ->withAdmin($otherUser)
            ->archived()
            ->create();

        $response = $this->postJson("/api/workspaces/{$foreignWorkspace->id}/restore");

        $response->assertStatus(403);
    }

    /**
     * Test user cannot delete default workspace.
     */
    public function test_user_cannot_delete_default_workspace(): void
    {
        $workspace = Workspace::factory()
            ->forTenant($this->tenant)
            ->withAdmin($this->user)
            ->default()
            ->create();

        $response = $this->deleteJson("/api/workspaces/{$workspace->id}");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'error' => 'Cannot delete the default workspace',
            ]);
    }

    /**
     * Test user can delete non-default workspace.
     */
    public function test_user_can_delete_non_default_workspace(): void
    {
        $workspace = Workspace::factory()
            ->forTenant($this->tenant)
            ->withAdmin($this->user)
            ->create();

        $response = $this->deleteJson("/api/workspaces/{$workspace->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('workspaces', [
            'id' => $workspace->id,
        ]);
    }

    /**
     * Test workspace validation rules.
     */
    public function test_workspace_validation_rules(): void
    {
        // Test missing name
        $response = $this->postJson("/api/tenants/{$this->tenant->id}/workspaces", [
            'description' => 'Test description',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // Test invalid color format
        $response = $this->postJson("/api/tenants/{$this->tenant->id}/workspaces", [
            'name' => 'Test Workspace',
            'color' => 'invalid-color',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['color']);
    }
}