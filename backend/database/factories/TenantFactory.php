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
            'stripe_customer_id' => fake()->optional(0.5)->regexify('cus_[a-zA-Z0-9]{14}'),
            'settings' => [
                'theme' => fake()->randomElement(['light', 'dark']),
                'timezone' => fake()->timezone(),
                'locale' => fake()->randomElement(['en', 'es', 'fr', 'de']),
                'notifications_enabled' => fake()->boolean(80),
                'two_factor_required' => fake()->boolean(20),
                'max_users' => fake()->numberBetween(5, 100),
            ],
            'status' => fake()->randomElement(['active', 'suspended', 'deactivated']),
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

    /**
     * Indicate that the tenant has an admin.
     */
    public function withAdmin(User $admin): static
    {
        return $this->afterCreating(function (Tenant $tenant) use ($admin) {
            $tenant->users()->attach($admin, [
                'role' => 'admin',
                'joined_at' => now(),
            ]);
        });
    }

    /**
     * Indicate that the tenant has members.
     */
    public function withMembers(int $count = 3): static
    {
        return $this->afterCreating(function (Tenant $tenant) use ($count) {
            $members = User::factory()->count($count)->create();
            
            foreach ($members as $member) {
                $tenant->users()->attach($member, [
                    'role' => fake()->randomElement(['member', 'admin']),
                    'joined_at' => now(),
                ]);
            }
        });
    }

    /**
     * Indicate that the tenant has a Stripe customer ID.
     */
    public function withStripeCustomer(): static
    {
        return $this->state(fn (array $attributes) => [
            'stripe_customer_id' => 'cus_' . fake()->regexify('[a-zA-Z0-9]{14}'),
        ]);
    }

    /**
     * Indicate that the tenant has workspaces.
     */
    public function withWorkspaces(int $count = 2): static
    {
        return $this->has(
            Workspace::factory()->count($count),
            'workspaces'
        );
    }
}