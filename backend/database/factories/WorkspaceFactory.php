<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Workspace;
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
        return [
            'name' => fake()->unique()->company(),
            'default_locale' => fake()->randomElement(['en', 'es', 'fr']),
            'logo_url' => null,
            'owner_id' => User::factory(),
        ];
    }

    /**
     * Configure the factory.
     *
     * @return $this
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Workspace $workspace): void {
            $workspace->members()->syncWithoutDetaching([
                $workspace->owner_id => ['role' => 'Owner'],
            ]);
        });
    }
}
