<?php

namespace Database\Factories;

use App\Models\Label;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Label>
 */
class LabelFactory extends Factory
{
    protected $model = Label::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => $this->faker->unique()->words(2, true),
            'color' => $this->faker->hexColor(),
        ];
    }

    /**
     * Create a label for a specific workspace.
     */
    public function forWorkspace(Workspace $workspace): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $workspace->id,
        ]);
    }

    /**
     * Create a bug label.
     */
    public function bug(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Bug',
            'color' => '#ef4444', // red
        ]);
    }

    /**
     * Create a feature label.
     */
    public function feature(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Feature',
            'color' => '#3b82f6', // blue
        ]);
    }

    /**
     * Create an enhancement label.
     */
    public function enhancement(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Enhancement',
            'color' => '#10b981', // green
        ]);
    }

    /**
     * Create a documentation label.
     */
    public function documentation(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Documentation',
            'color' => '#f59e0b', // amber
        ]);
    }

    /**
     * Create a high priority label.
     */
    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'High Priority',
            'color' => '#dc2626', // red-600
        ]);
    }

    /**
     * Create a low priority label.
     */
    public function lowPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Low Priority',
            'color' => '#6b7280', // gray-500
        ]);
    }

    /**
     * Create a review required label.
     */
    public function reviewRequired(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Review Required',
            'color' => '#8b5cf6', // violet
        ]);
    }

    /**
     * Create a testing label.
     */
    public function testing(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Testing',
            'color' => '#ec4899', // pink
        ]);
    }

    /**
     * Create a label with a specific color.
     */
    public function withColor(string $color): static
    {
        return $this->state(fn (array $attributes) => [
            'color' => $color,
        ]);
    }

    /**
     * Create a label with a specific name.
     */
    public function withName(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
        ]);
    }

    /**
     * Create a common set of labels for a workspace.
     */
    public static function createCommonLabels(Workspace $workspace): array
    {
        $labels = [];

        $labels[] = Label::factory()->bug()->forWorkspace($workspace)->create();
        $labels[] = Label::factory()->feature()->forWorkspace($workspace)->create();
        $labels[] = Label::factory()->enhancement()->forWorkspace($workspace)->create();
        $labels[] = Label::factory()->documentation()->forWorkspace($workspace)->create();
        $labels[] = Label::factory()->reviewRequired()->forWorkspace($workspace)->create();
        $labels[] = Label::factory()->testing()->forWorkspace($workspace)->create();

        return $labels;
    }
}