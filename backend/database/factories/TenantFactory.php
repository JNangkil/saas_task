<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Tenant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();
        $slug = strtolower(str_replace(' ', '-', $name)) . '-' . fake()->unique()->randomNumber(4);
        
        return [
            'name' => $name,
            'slug' => $slug,
            'logo_url' => fake()->optional(0.3)->imageUrl(100, 100, 'business'),
            'billing_email' => fake()->optional(0.7)->companyEmail(),
            'settings' => [
                'theme' => fake()->randomElement(['light', 'dark']),
                'timezone' => fake()->timezone(),
                'locale' => fake()->randomElement(['en', 'es', 'fr', 'de']),
            ],
            'status' => 'active',
            'locale' => fake()->randomElement(['en', 'es', 'fr', 'de']),
            'timezone' => fake()->timezone(),
        ];
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
     * Indicate that the tenant has an owner.
     */
    public function withOwner(User $owner): static
    {
        return $this->afterCreating(function (Tenant $tenant) use ($owner) {
            $tenant->users()->attach($owner, [
                'role' => 'owner',
                'joined_at' => now(),
            ]);
        });
    }
}