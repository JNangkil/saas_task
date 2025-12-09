<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskCustomValue;
use App\Models\TaskField;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskCustomValue>
 */
class TaskCustomValueFactory extends Factory
{
    protected $model = TaskCustomValue::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $task = Task::factory()->create();

        // Create a task field if it doesn't exist
        $field = TaskField::factory()->create([
            'workspace_id' => $task->workspace_id,
        ]);

        $fieldType = $field->type ?? 'text';

        // Generate appropriate value based on field type
        $value = match($fieldType) {
            'text' => $this->faker->sentence(3),
            'number' => $this->faker->randomFloat(2, 0, 1000),
            'date' => $this->faker->date(),
            'boolean' => $this->faker->boolean(),
            'select' => $this->faker->randomElement($field->options ?? ['Option 1', 'Option 2', 'Option 3']),
            'multiselect' => $this->faker->randomElements($field->options ?? ['Option 1', 'Option 2', 'Option 3', 'Option 4'], 2),
            'url' => $this->faker->url(),
            'email' => $this->faker->email(),
            'textarea' => $this->faker->paragraphs(3, true),
            default => $this->faker->word(),
        };

        return [
            'task_id' => $task->id,
            'field_key' => $field->key,
            'field_value' => $value,
        ];
    }

    /**
     * Create a custom value for a specific task.
     */
    public function forTask(Task $task): static
    {
        return $this->state(fn (array $attributes) => [
            'task_id' => $task->id,
        ]);
    }

    /**
     * Create a custom value with a specific field key.
     */
    public function withFieldKey(string $fieldKey): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $fieldKey,
        ]);
    }

    /**
     * Create a custom value with a specific value.
     */
    public function withValue($value): static
    {
        return $this->state(fn (array $attributes) => [
            'field_value' => $value,
        ]);
    }

    /**
     * Create a text custom value.
     */
    public function text(string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_text',
            'field_value' => $value ?? $this->faker->sentence(3),
        ]);
    }

    /**
     * Create a number custom value.
     */
    public function number(float $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_number',
            'field_value' => $value ?? $this->faker->randomFloat(2, 0, 1000),
        ]);
    }

    /**
     * Create a date custom value.
     */
    public function date($date = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_date',
            'field_value' => $date ?? $this->faker->date(),
        ]);
    }

    /**
     * Create a boolean custom value.
     */
    public function boolean(bool $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_boolean',
            'field_value' => $value ?? $this->faker->boolean(),
        ]);
    }

    /**
     * Create a select custom value.
     */
    public function select(array $options = null, $value = null): static
    {
        $options = $options ?? ['Option 1', 'Option 2', 'Option 3'];

        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_select',
            'field_value' => $value ?? $this->faker->randomElement($options),
        ]);
    }

    /**
     * Create a multiselect custom value.
     */
    public function multiselect(array $options = null, array $value = null): static
    {
        $options = $options ?? ['Option 1', 'Option 2', 'Option 3', 'Option 4'];

        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_multiselect',
            'field_value' => $value ?? $this->faker->randomElements($options, 2),
        ]);
    }

    /**
     * Create a URL custom value.
     */
    public function url(string $url = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_url',
            'field_value' => $url ?? $this->faker->url(),
        ]);
    }

    /**
     * Create an email custom value.
     */
    public function email(string $email = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_email',
            'field_value' => $email ?? $this->faker->email(),
        ]);
    }

    /**
     * Create a textarea custom value.
     */
    public function textarea(string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => $attributes['field_key'] ?? 'custom_textarea',
            'field_value' => $value ?? $this->faker->paragraphs(3, true),
        ]);
    }

    /**
     * Create an estimated hours custom value.
     */
    public function estimatedHours(float $hours = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => 'estimated_hours',
            'field_value' => $hours ?? $this->faker->randomFloat(1, 1, 40),
        ]);
    }

    /**
     * Create an actual hours custom value.
     */
    public function actualHours(float $hours = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => 'actual_hours',
            'field_value' => $hours ?? $this->faker->randomFloat(1, 0, 50),
        ]);
    }

    /**
     * Create a priority score custom value.
     */
    public function priorityScore(int $score = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => 'priority_score',
            'field_value' => $score ?? $this->faker->numberBetween(1, 10),
        ]);
    }

    /**
     * Create a budget custom value.
     */
    public function budget(float $amount = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => 'budget',
            'field_value' => $amount ?? $this->faker->randomFloat(2, 100, 10000),
        ]);
    }

    /**
     * Create a completion percentage custom value.
     */
    public function completionPercentage(int $percentage = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field_key' => 'completion_percentage',
            'field_value' => $percentage ?? $this->faker->numberBetween(0, 100),
        ]);
    }

    /**
     * Create a set of common custom values for a task.
     */
    public static function createCommonValues(Task $task): array
    {
        $values = [];

        $values[] = static::factory()->estimatedHours()->forTask($task)->create();
        $values[] = static::factory()->actualHours()->forTask($task)->create();
        $values[] = static::factory()->priorityScore()->forTask($task)->create();
        $values[] = static::factory()->completionPercentage()->forTask($task)->create();

        return $values;
    }
}