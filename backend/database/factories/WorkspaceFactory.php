<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Workspace>
 */
class WorkspaceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $workspaceNames = [
            'Marketing', 'Development', 'Sales', 'Support', 'HR', 
            'Finance', 'Operations', 'Product', 'Design', 'Engineering',
            'Customer Success', 'Legal', 'Research', 'Analytics', 'Infrastructure'
        ];
        
        $name = $this->faker->randomElement($workspaceNames);
        
        return [
            'tenant_id' => Tenant::factory(),
            'name' => $name,
            'description' => $this->faker->optional(0.7)->sentence(10),
            'color' => $this->faker->hexColor(),
            'icon' => $this->faker->optional(0.6)->randomElement(['🏢', '💼', '🚀', '💡', '🎯', '📊', '🔧', '🎨', '📈', '🔍']),
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
     * Indicate that the workspace is the default for its tenant.
     */
    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }

    /**
     * Create a workspace with a specific name.
     */
    public function withName(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
        ]);
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
     * Create a workspace with a description.
     */
    public function withDescription(string $description): static
    {
        return $this->state(fn (array $attributes) => [
            'description' => $description,
        ]);
    }

    /**
     * Create a workspace for a specific tenant.
     */
    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Create a workspace with a specific tenant ID.
     */
    public function forTenantId(int $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }
}