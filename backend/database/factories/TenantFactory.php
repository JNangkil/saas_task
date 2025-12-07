<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->company();
        $slug = strtolower(str_replace(' ', '-', $name));
        
        return [
            'name' => $name,
            'slug' => $slug . '-' . $this->faker->unique()->randomNumber(4),
            'logo_url' => $this->faker->optional(0.7)->imageUrl(200, 200, 'business'),
            'billing_email' => $this->faker->optional(0.8)->companyEmail(),
            'settings' => [
                'theme' => $this->faker->randomElement(['light', 'dark']),
                'timezone' => $this->faker->timezone(),
                'locale' => $this->faker->randomElement(['en_US', 'en_GB', 'es_ES', 'fr_FR']),
            ],
            'status' => $this->faker->randomElement(['active', 'suspended', 'deactivated']),
            'locale' => $this->faker->randomElement(['en_US', 'en_GB', 'es_ES', 'fr_FR']),
            'timezone' => $this->faker->timezone(),
        ];
    }

    /**
     * Indicate that the tenant is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Indicate that the tenant is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
        ]);
    }

    /**
     * Indicate that the tenant is deactivated.
     */
    public function deactivated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'deactivated',
        ]);
    }

    /**
     * Create a tenant with a specific slug.
     */
    public function withSlug(string $slug): static
    {
        return $this->state(fn (array $attributes) => [
            'slug' => $slug,
        ]);
    }

    /**
     * Create a tenant with a specific name.
     */
    public function withName(string $name): static
    {
        $slug = strtolower(str_replace(' ', '-', $name));
        
        return $this->state(fn (array $attributes) => [
            'name' => $name,
            'slug' => $slug,
        ]);
    }
}