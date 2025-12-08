<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class TenantTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    /**
     * Test user can create a tenant.
     */
    public function test_user_can_create_tenant(): void
    {
        $tenantData = [
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'billing_email' => 'billing@example.com',
            'locale' => 'en',
            'timezone' => 'UTC',
        ];

        $response = $this->postJson('/api/tenants', $tenantData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'slug',
                    'billing_email',
                    'locale',
                    'timezone',
                    'status',
                    'created_at',
                    'updated_at',
                ]
            ]);

        $this->assertDatabaseHas('tenants', [
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
        ]);

        // Check that user is attached as owner
        $this->assertDatabaseHas('tenant_user', [
            'user_id' => $this->user->id,
            'role' => 'owner',
        ]);
    }

    /**
     * Test user can view their tenants.
     */
    public function test_user_can_view_their_tenants(): void
    {
        $tenant = Tenant::factory()->withOwner($this->user)->create();

        $response = $this->getJson('/api/tenants');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'user_role',
                    ]
                ]
            ]);

        $response->assertJsonFragment([
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'user_role' => 'owner',
        ]);
    }

    /**
     * Test user cannot view tenants they don't belong to.
     */
    public function test_user_cannot_view_foreign_tenants(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $response = $this->getJson("/api/tenants/{$foreignTenant->id}");

        $response->assertStatus(403);
    }

    /**
     * Test user can update their tenant.
     */
    public function test_user_can_update_their_tenant(): void
    {
        $tenant = Tenant::factory()->withOwner($this->user)->create();

        $updateData = [
            'name' => 'Updated Tenant Name',
            'billing_email' => 'updated@example.com',
        ];

        $response = $this->putJson("/api/tenants/{$tenant->id}", $updateData);

        $response->assertStatus(200);

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'name' => 'Updated Tenant Name',
            'billing_email' => 'updated@example.com',
        ]);
    }

    /**
     * Test user cannot update tenant they don't own.
     */
    public function test_user_cannot_update_foreign_tenant(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $updateData = [
            'name' => 'Hacked Tenant Name',
        ];

        $response = $this->putJson("/api/tenants/{$foreignTenant->id}", $updateData);

        $response->assertStatus(403);
    }

    /**
     * Test user can archive their tenant.
     */
    public function test_user_can_archive_their_tenant(): void
    {
        $tenant = Tenant::factory()->withOwner($this->user)->create();

        $response = $this->postJson("/api/tenants/{$tenant->id}/archive");

        $response->assertStatus(200);

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'status' => 'deactivated',
        ]);
    }

    /**
     * Test user cannot archive foreign tenant.
     */
    public function test_user_cannot_archive_foreign_tenant(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $response = $this->postJson("/api/tenants/{$foreignTenant->id}/archive");

        $response->assertStatus(403);
    }

    /**
     * Test user can delete their tenant.
     */
    public function test_user_can_delete_their_tenant(): void
    {
        $tenant = Tenant::factory()->withOwner($this->user)->create();

        $response = $this->deleteJson("/api/tenants/{$tenant->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('tenants', [
            'id' => $tenant->id,
        ]);
    }

    /**
     * Test user cannot delete foreign tenant.
     */
    public function test_user_cannot_delete_foreign_tenant(): void
    {
        $otherUser = User::factory()->create();
        $foreignTenant = Tenant::factory()->withOwner($otherUser)->create();

        $response = $this->deleteJson("/api/tenants/{$foreignTenant->id}");

        $response->assertStatus(403);
    }

    /**
     * Test tenant validation rules.
     */
    public function test_tenant_validation_rules(): void
    {
        // Test missing name
        $response = $this->postJson('/api/tenants', [
            'slug' => 'test-tenant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // Test invalid slug format
        $response = $this->postJson('/api/tenants', [
            'name' => 'Test Tenant',
            'slug' => 'invalid slug with spaces',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);

        // Test duplicate slug
        $existingTenant = Tenant::factory()->create();
        $response = $this->postJson('/api/tenants', [
            'name' => 'Test Tenant',
            'slug' => $existingTenant->slug,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);
    }
}