<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    protected $model = Plan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(2, true),
            'slug' => $this->faker->unique()->slug(),
            'price' => $this->faker->randomElement([0, 9.99, 19.99, 49.99, 99.99, 199.99]),
            'billing_interval' => $this->faker->randomElement(['month', 'year']),
            'trial_days' => $this->faker->randomElement([0, 7, 14, 30]),
            'limits' => [
                'max_users' => $this->faker->numberBetween(1, 100),
                'max_workspaces' => $this->faker->numberBetween(1, 50),
                'max_boards' => $this->faker->numberBetween(5, 500),
                'max_storage_mb' => $this->faker->numberBetween(100, 50000),
            ],
            'features' => $this->faker->randomElements([
                'basic_features',
                'email_support',
                'priority_support',
                'api_access',
                'basic_integrations',
                'advanced_integrations',
                'advanced_permissions',
                'analytics',
                'custom_themes',
                'dedicated_support',
                'sla_guarantee',
            ], $this->faker->numberBetween(2, 6)),
            'stripe_price_id' => 'price_' . $this->faker->unique()->sha1(),
            'metadata' => [
                'tier' => $this->faker->randomElement(['free', 'starter', 'pro', 'enterprise']),
                'description' => $this->faker->sentence(),
            ],
            'is_popular' => $this->faker->boolean(20), // 20% chance of being popular
        ];
    }

    /**
     * Indicate that the plan is free.
     */
    public function free(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Free',
            'slug' => 'free',
            'price' => 0,
            'billing_interval' => 'month',
            'trial_days' => 0,
            'limits' => [
                'max_users' => 3,
                'max_workspaces' => 1,
                'max_boards' => 5,
                'max_storage_mb' => 100,
            ],
            'features' => ['basic_features', 'email_support'],
            'metadata' => [
                'tier' => 'free',
                'description' => 'Perfect for small teams getting started',
            ],
            'is_popular' => false,
        ]);
    }

    /**
     * Indicate that the plan is a starter plan.
     */
    public function starter(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Starter',
            'slug' => 'starter',
            'price' => 19.99,
            'billing_interval' => 'month',
            'trial_days' => 14,
            'limits' => [
                'max_users' => 10,
                'max_workspaces' => 3,
                'max_boards' => 20,
                'max_storage_mb' => 1000,
            ],
            'features' => [
                'basic_features',
                'email_support',
                'api_access',
                'basic_integrations',
            ],
            'metadata' => [
                'tier' => 'starter',
                'description' => 'Great for growing teams',
            ],
            'is_popular' => false,
        ]);
    }

    /**
     * Indicate that the plan is a pro plan.
     */
    public function pro(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Pro',
            'slug' => 'pro',
            'price' => 49.99,
            'billing_interval' => 'month',
            'trial_days' => 14,
            'limits' => [
                'max_users' => 50,
                'max_workspaces' => 10,
                'max_boards' => 100,
                'max_storage_mb' => 10000,
            ],
            'features' => [
                'basic_features',
                'priority_support',
                'api_access',
                'advanced_integrations',
                'advanced_permissions',
                'analytics',
            ],
            'metadata' => [
                'tier' => 'pro',
                'description' => 'Advanced features for professional teams',
            ],
            'is_popular' => true,
        ]);
    }

    /**
     * Indicate that the plan is an enterprise plan.
     */
    public function enterprise(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Enterprise',
            'slug' => 'enterprise',
            'price' => 199.99,
            'billing_interval' => 'month',
            'trial_days' => 30,
            'limits' => [
                'max_users' => -1, // Unlimited
                'max_workspaces' => -1, // Unlimited
                'max_boards' => -1, // Unlimited
                'max_storage_mb' => -1, // Unlimited
            ],
            'features' => [
                'basic_features',
                'priority_support',
                'api_access',
                'advanced_integrations',
                'advanced_permissions',
                'analytics',
                'custom_themes',
                'dedicated_support',
                'sla_guarantee',
            ],
            'metadata' => [
                'tier' => 'enterprise',
                'description' => 'Custom solution for large organizations',
            ],
            'is_popular' => false,
        ]);
    }

    /**
     * Indicate that the plan is monthly.
     */
    public function monthly(): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_interval' => 'month',
        ]);
    }

    /**
     * Indicate that the plan is yearly.
     */
    public function yearly(): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_interval' => 'year',
            'price' => $attributes['price'] * 10, // 2 months free
        ]);
    }

    /**
     * Indicate that the plan is popular.
     */
    public function popular(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_popular' => true,
        ]);
    }

    /**
     * Indicate that the plan has a trial.
     */
    public function withTrial(int $days = 14): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_days' => $days,
        ]);
    }

    /**
     * Indicate that the plan has no trial.
     */
    public function withoutTrial(): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_days' => 0,
        ]);
    }
}