<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Mail;
use App\Mail\WorkspaceInvitation;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected User $workspaceAdmin;
    protected Tenant $tenant;
    protected Workspace $workspace;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->workspaceAdmin = User::factory()->create();
        $this->tenant = Tenant::factory()->withOwner($this->workspaceAdmin)->create();
        $this->workspace = Workspace::factory()->forTenant($this->tenant)->withAdmin($this->workspaceAdmin)->create();
        $this->actingAs($this->workspaceAdmin);
    }

    /**
     * Test creating invitations with valid data.
     */
    public function test_can_create_invitation_with_valid_data(): void
    {
        Mail::fake();

        $invitationData = [
            'email' => 'test@example.com',
            'role' => 'member',
            'message' => 'Please join our workspace',
        ];

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'workspace_id',
                    'email',
                    'role',
                    'message',
                    'expires_at',
                    'status',
                    'workspace',
                    'invited_by',
                ]
            ]);

        $this->assertDatabaseHas('invitations', [
            'workspace_id' => $this->workspace->id,
            'email' => 'test@example.com',
            'role' => 'member',
            'status' => 'pending',
        ]);

        Mail::assertSent(WorkspaceInvitation::class, function ($mail) use ($invitationData) {
            return $mail->invitation->email === $invitationData['email'];
        });
    }

    /**
     * Test preventing duplicate invitations for the same email.
     */
    public function test_prevents_duplicate_invitations(): void
    {
        $email = 'test@example.com';
        
        // Create first invitation
        Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'email' => $email,
            'status' => 'pending',
        ]);

        $invitationData = [
            'email' => $email,
            'role' => 'member',
        ];

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'User with this email already has a pending invitation',
            ]);
    }

    /**
     * Test preventing invitations to existing workspace members.
     */
    public function test_prevents_invitations_to_existing_members(): void
    {
        $member = User::factory()->create();
        $this->workspace->users()->attach($member->id, ['role' => 'member']);

        $invitationData = [
            'email' => $member->email,
            'role' => 'member',
        ];

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'User with this email is already a member of this workspace',
            ]);
    }

    /**
     * Test permission checks for invitation creation.
     */
    public function test_permission_checks_for_invitation_creation(): void
    {
        $regularUser = User::factory()->create();
        $this->actingAs($regularUser);

        $invitationData = [
            'email' => 'test@example.com',
            'role' => 'member',
        ];

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        $response->assertStatus(403);
    }

    /**
     * Test accepting invitations for existing users.
     */
    public function test_accepting_invitation_for_existing_user(): void
    {
        $existingUser = User::factory()->create();
        $this->tenant->users()->attach($existingUser->id, ['role' => 'member']);

        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'email' => $existingUser->email,
            'role' => 'member',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/accept");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'workspace' => [
                    'id',
                    'name',
                ],
            ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
        ]);

        $this->assertDatabaseHas('workspace_user', [
            'user_id' => $existingUser->id,
            'workspace_id' => $this->workspace->id,
            'role' => 'member',
        ]);
    }

    /**
     * Test accepting invitations for new users with registration.
     */
    public function test_accepting_invitation_for_new_user_with_registration(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'email' => 'newuser@example.com',
            'role' => 'member',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $registrationData = [
            'name' => 'New User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson("/api/invitations/{$invitation->token}/accept", $registrationData);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Registration successful and invitation accepted',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'name' => 'New User',
        ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
        ]);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $this->workspace->id,
            'role' => 'member',
        ]);

        $this->assertDatabaseHas('tenant_user', [
            'tenant_id' => $this->tenant->id,
            'role' => 'member',
        ]);
    }

    /**
     * Test accepting invitations for new users without registration data.
     */
    public function test_accepting_invitation_for_new_user_without_registration_data(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'email' => 'newuser@example.com',
            'role' => 'member',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/accept");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'requires_registration',
                'email',
                'workspace' => [
                    'id',
                    'name',
                    'role',
                ],
                'tenant' => [
                    'id',
                    'name',
                    'slug',
                ],
            ])
            ->assertJsonFragment([
                'requires_registration' => true,
                'email' => 'newuser@example.com',
            ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Test declining invitations.
     */
    public function test_declining_invitation(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'email' => 'test@example.com',
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/decline");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Invitation declined successfully',
            ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'status' => 'cancelled',
        ]);
    }

    /**
     * Test token validation for non-existent invitations.
     */
    public function test_token_validation_for_non_existent_invitation(): void
    {
        $response = $this->getJson("/api/invitations/non-existent-token");

        $response->assertStatus(404)
            ->assertJsonFragment([
                'message' => 'Invitation not found',
            ]);
    }

    /**
     * Test token validation for expired invitations.
     */
    public function test_token_validation_for_expired_invitation(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'email' => 'test@example.com',
            'status' => 'pending',
            'expires_at' => now()->subDays(1),
        ]);

        $response = $this->getJson("/api/invitations/{$invitation->token}");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This invitation has expired',
            ]);
    }

    /**
     * Test accepting expired invitations.
     */
    public function test_accepting_expired_invitation(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'email' => 'test@example.com',
            'status' => 'pending',
            'expires_at' => now()->subDays(1),
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/accept");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This invitation has expired',
            ]);
    }

    /**
     * Test declining already accepted invitations.
     */
    public function test_declining_already_accepted_invitation(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'email' => 'test@example.com',
            'status' => 'accepted',
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/decline");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This invitation can no longer be declined',
            ]);
    }

    /**
     * Test listing pending invitations for a workspace.
     */
    public function test_listing_pending_invitations(): void
    {
        Invitation::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'pending',
        ]);

        Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'accepted',
        ]);

        $response = $this->getJson("/api/workspaces/{$this->workspace->id}/invitations");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'email',
                        'role',
                        'message',
                        'expires_at',
                        'status',
                        'invited_by',
                    ]
                ],
                'links',
                'meta',
            ]);

        $this->assertEquals(3, count($response->json('data')));
    }

    /**
     * Test deleting invitations.
     */
    public function test_deleting_invitation(): void
    {
        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
        ]);

        $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/invitations/{$invitation->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Invitation cancelled successfully',
            ]);

        $this->assertSoftDeleted('invitations', [
            'id' => $invitation->id,
        ]);
    }

    /**
     * Test resending invitations.
     */
    public function test_resending_invitation(): void
    {
        Mail::fake();

        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'expires_at' => now()->subDays(1),
        ]);

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations/{$invitation->id}/resend");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Invitation resent successfully',
            ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'expires_at' => now()->addDays(7),
        ]);

        Mail::assertSent(WorkspaceInvitation::class);
    }

    /**
     * Test invitation validation rules.
     */
    public function test_invitation_validation_rules(): void
    {
        // Test missing email
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", [
            'role' => 'member',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        // Test invalid email
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", [
            'email' => 'invalid-email',
            'role' => 'member',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        // Test invalid role
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", [
            'email' => 'test@example.com',
            'role' => 'invalid-role',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // Test message too long
        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", [
            'email' => 'test@example.com',
            'role' => 'member',
            'message' => str_repeat('a', 1001),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }

    /**
     * Test user cannot accept invitation if not part of tenant.
     */
    public function test_user_cannot_accept_invitation_if_not_part_of_tenant(): void
    {
        $externalUser = User::factory()->create();
        $this->actingAs($externalUser);

        $invitation = Invitation::factory()->create([
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'email' => $externalUser->email,
            'role' => 'member',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->postJson("/api/invitations/{$invitation->token}/accept");

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'You must be a member of the tenant to accept this invitation',
            ]);
    }

    /**
     * Test email sending functionality.
     */
    public function test_email_sending_functionality(): void
    {
        Mail::fake();

        $invitationData = [
            'email' => 'test@example.com',
            'role' => 'member',
            'message' => 'Please join our workspace',
        ];

        $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        Mail::assertSent(WorkspaceInvitation::class, function ($mail) use ($invitationData) {
            return $mail->invitation->email === $invitationData['email'] &&
                   $mail->to[0]['address'] === $invitationData['email'];
        });
    }

    /**
     * Test email sending failure handling.
     */
    public function test_email_sending_failure_handling(): void
    {
        Mail::fake();
        Mail::shouldReceive('to->send')->andThrow(new \Exception('Mail server error'));

        $invitationData = [
            'email' => 'test@example.com',
            'role' => 'member',
        ];

        $response = $this->postJson("/api/workspaces/{$this->workspace->id}/invitations", $invitationData);

        // Should still create the invitation even if email fails
        $response->assertStatus(201);

        $this->assertDatabaseHas('invitations', [
            'email' => 'test@example.com',
            'status' => 'pending',
        ]);
    }
}