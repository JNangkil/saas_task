<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspaceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_their_workspaces(): void
    {
        $user = User::factory()->create([
            'roles' => ['Owner'],
        ]);

        $workspace = Workspace::factory()->create([
            'owner_id' => $user->id,
            'name' => 'Acme Workspace',
        ]);

        // Attach the user explicitly for clarity when overriding the owner relation.
        $workspace->members()->syncWithoutDetaching([
            $user->id => ['role' => 'Owner'],
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/workspaces');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'name' => 'Acme Workspace',
                'membershipRole' => 'Owner',
            ]);
    }

    public function test_owner_can_create_workspace(): void
    {
        $user = User::factory()->create([
            'roles' => ['Owner'],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/workspaces', [
            'name' => 'Growth Lab',
            'default_locale' => 'en',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Growth Lab')
            ->assertJsonPath('data.membershipRole', 'Owner');

        $this->assertDatabaseHas('workspaces', [
            'name' => 'Growth Lab',
        ]);
    }

    public function test_member_cannot_create_workspace(): void
    {
        $member = User::factory()->create([
            'roles' => ['Member'],
        ]);

        Sanctum::actingAs($member);

        $response = $this->postJson('/api/workspaces', [
            'name' => 'Unauthorized Workspace',
            'default_locale' => 'en',
        ]);

        $response->assertForbidden();
    }

    public function test_admin_can_update_workspace(): void
    {
        $owner = User::factory()->create(['roles' => ['Owner']]);
        $admin = User::factory()->create(['roles' => ['Admin']]);

        $workspace = Workspace::factory()->create([
            'owner_id' => $owner->id,
            'name' => 'Initial Name',
            'default_locale' => 'en',
        ]);

        $workspace->members()->syncWithoutDetaching([
            $owner->id => ['role' => 'Owner'],
            $admin->id => ['role' => 'Admin'],
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/workspaces/{$workspace->id}", [
            'name' => 'Updated Name',
            'default_locale' => 'es',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.defaultLocale', 'es');

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'name' => 'Updated Name',
            'default_locale' => 'es',
        ]);
    }

    public function test_member_cannot_update_workspace(): void
    {
        $owner = User::factory()->create(['roles' => ['Owner']]);
        $member = User::factory()->create(['roles' => ['Member']]);

        $workspace = Workspace::factory()->create([
            'owner_id' => $owner->id,
        ]);

        $workspace->members()->syncWithoutDetaching([
            $owner->id => ['role' => 'Owner'],
            $member->id => ['role' => 'Member'],
        ]);

        Sanctum::actingAs($member);

        $response = $this->patchJson("/api/workspaces/{$workspace->id}", [
            'name' => 'New Name',
        ]);

        $response->assertForbidden();
    }

    public function test_owner_can_delete_workspace(): void
    {
        $owner = User::factory()->create(['roles' => ['Owner']]);

        $workspace = Workspace::factory()->create([
            'owner_id' => $owner->id,
            'name' => 'Disposable Workspace',
        ]);

        $workspace->members()->syncWithoutDetaching([
            $owner->id => ['role' => 'Owner'],
        ]);

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/workspaces/{$workspace->id}");

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Workspace deleted successfully.']);

        $this->assertDatabaseMissing('workspaces', [
            'id' => $workspace->id,
        ]);
    }
}

