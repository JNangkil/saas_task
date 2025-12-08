<?php

namespace Database\Factories;

use App\Models\Invitation;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invitation>
 */
class InvitationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Invitation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'tenant_id' => Tenant::factory(),
            'email' => fake()->unique()->safeEmail(),
            'role' => fake()->randomElement(['admin', 'member', 'viewer']),
            'token' => Invitation::generateToken(),
            'message' => fake()->optional(0.7)->sentence(10),
            'invited_by' => User::factory(),
            'expires_at' => now()->addDays(7),
            'status' => 'pending',
            'accepted_at' => null,
        ];
    }

    /**
     * Indicate that the invitation is accepted.
     */
    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);
    }

    /**
     * Indicate that the invitation is declined/cancelled.
     */
    public function declined(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    /**
     * Indicate that the invitation is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subDays(1),
        ]);
    }

    /**
     * Indicate that the invitation belongs to a specific workspace.
     */
    public function forWorkspace(Workspace $workspace): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $workspace->id,
            'tenant_id' => $workspace->tenant_id,
        ]);
    }

    /**
     * Indicate that the invitation belongs to a specific tenant.
     */
    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Indicate that the invitation was sent by a specific user.
     */
    public function invitedBy(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'invited_by' => $user->id,
        ]);
    }

    /**
     * Indicate that the invitation is for a specific email.
     */
    public function forEmail(string $email): static
    {
        return $this->state(fn (array $attributes) => [
            'email' => $email,
        ]);
    }

    /**
     * Indicate that the invitation has a specific role.
     */
    public function withRole(string $role): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => $role,
        ]);
    }
}