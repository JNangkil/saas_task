<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Workspace>
 */
class WorkspaceFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Workspace::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional(0.7)->sentence(10),
            'color' => fake()->hexColor(),
            'icon' => fake()->randomElement(['🏢', '💼', '📊', '🎯', '🚀', '💡', '🎨', '📱', '🌐', '🔧']),
            'is_archived' => false,
            'is_default' => false,
        ];
    }

    /**
     * Indicate that the workspace is archived.
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_archived' => true,
        ]);
    }

    /**
     * Indicate that the workspace is the default workspace.
     */
    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }

    /**
     * Indicate that the workspace belongs to a specific tenant.
     */
    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Indicate that the workspace has an admin.
     */
    public function withAdmin(User $admin): static
    {
        return $this->afterCreating(function (Workspace $workspace) use ($admin) {
            $workspace->users()->attach($admin, [
                'role' => 'admin',
                'joined_at' => now(),
            ]);
        });
    }

    /**
     * Indicate that the workspace has members.
     */
    public function withMembers(int $count = 3): static
    {
        return $this->afterCreating(function (Workspace $workspace) use ($count) {
            $members = User::factory()->count($count)->create();
            
            foreach ($members as $member) {
                $workspace->users()->attach($member, [
                    'role' => fake()->randomElement(['member', 'viewer']),
                    'joined_at' => now(),
                ]);
            }
        });
    }
}