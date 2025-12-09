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
        $workspaceTypes = ['Development', 'Marketing', 'Sales', 'Design', 'Operations', 'Finance', 'HR', 'Support'];
        $type = fake()->randomElement($workspaceTypes);
        
        return [
            'tenant_id' => Tenant::factory(),
            'name' => $type . ' ' . fake()->randomElement(['Team', 'Workspace', 'Hub', 'Center', 'Department']),
            'description' => fake()->optional(0.8)->sentence(15),
            'color' => fake()->hexColor(),
            'icon' => fake()->randomElement(['🏢', '💼', '📊', '🎯', '🚀', '💡', '🎨', '📱', '🌐', '🔧', '🛠️', '📈', '🎪', '🌟']),
            'is_archived' => fake()->boolean(10), // 10% chance of being archived
            'is_default' => fake()->boolean(5),  // 5% chance of being default
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
                    'joined_at' => fake()->dateTimeBetween('-6 months', 'now'),
                ]);
            }
        });
    }

    /**
     * Indicate that the workspace has an owner.
     */
    public function withOwner(User $owner): static
    {
        return $this->afterCreating(function (Workspace $workspace) use ($owner) {
            $workspace->users()->attach($owner, [
                'role' => 'owner',
                'joined_at' => now(),
            ]);
        });
    }

    /**
     * Indicate that the workspace has boards.
     */
    public function withBoards(int $count = 3): static
    {
        return $this->afterCreating(function (Workspace $workspace) use ($count) {
            \App\Models\Board::factory()->count($count)->create([
                'workspace_id' => $workspace->id,
                'tenant_id' => $workspace->tenant_id,
            ]);
        });
    }

    /**
     * Create a workspace with a specific color.
     */
    public function withColor(string $color): static
    {
        return $this->state(fn (array $attributes) => [
            'color' => $color,
        ]);
    }

    /**
     * Create a workspace with a specific icon.
     */
    public function withIcon(string $icon): static
    {
        return $this->state(fn (array $attributes) => [
            'icon' => $icon,
        ]);
    }

    /**
     * Create a workspace with a specific name pattern.
     */
    public function withNamePattern(string $pattern): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $pattern . ' ' . fake()->randomElement(['Team', 'Workspace', 'Hub']),
        ]);
    }
}