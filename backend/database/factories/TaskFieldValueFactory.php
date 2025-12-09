<?php

namespace Database\Factories;

use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\TaskFieldValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskFieldValue>
 */
class TaskFieldValueFactory extends Factory
{
    protected $model = TaskFieldValue::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $task = Task::factory()->create();
        $column = BoardColumn::factory()->create(['board_id' => $task->board_id]);

        return [
            'task_id' => $task->id,
            'board_column_id' => $column->id,
            'value' => $this->generateValue($column),
        ];
    }

    /**
     * Generate a value based on the column type.
     */
    protected function generateValue(BoardColumn $column): mixed
    {
        return match ($column->type) {
            'text', 'email', 'url' => $this->faker->sentence(3),
            'textarea' => $this->faker->paragraphs(3, true),
            'number' => $this->faker->randomFloat(2, 0, 1000),
            'date' => $this->faker->date(),
            'datetime' => $this->faker->dateTime()->format('Y-m-d H:i:s'),
            'boolean', 'checkbox' => $this->faker->boolean(),
            'select' => $this->faker->randomElement(
                collect($column->options['choices'] ?? [])->pluck('value')->toArray() ?: ['option1', 'option2']
            ),
            'multiselect' => $this->faker->randomElements(
                collect($column->options['choices'] ?? [])->pluck('value')->toArray() ?: ['tag1', 'tag2', 'tag3'],
                $this->faker->numberBetween(1, 3)
            ),
            'file' => [
                'name' => $this->faker->words(2, true) . '.' . $this->faker->fileExtension(),
                'size' => $this->faker->numberBetween(1000, 100000),
                'url' => $this->faker->url(),
            ],
            'user' => $this->faker->boolean(70) ? $this->faker->uuid() : null,
            default => $this->faker->word(),
        };
    }

    /**
     * Create a field value for a specific task.
     */
    public function forTask(Task $task): static
    {
        return $this->state(fn (array $attributes) => [
            'task_id' => $task->id,
            'board_column_id' => $attributes['board_column_id'] ?? BoardColumn::factory()->create(['board_id' => $task->board_id]),
        ]);
    }

    /**
     * Create a field value for a specific column.
     */
    public function forColumn(BoardColumn $column): static
    {
        return $this->state(fn (array $attributes) => [
            'board_column_id' => $column->id,
            'task_id' => $attributes['task_id'] ?? Task::factory()->create(['board_id' => $column->board_id]),
        ]);
    }

    /**
     * Create a field value with a specific value.
     */
    public function withValue($value): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value,
        ]);
    }

    /**
     * Create a text field value.
     */
    public function text(string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? $this->faker->sentence(3),
        ]);
    }

    /**
     * Create a textarea field value.
     */
    public function textarea(string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? $this->faker->paragraphs(3, true),
        ]);
    }

    /**
     * Create a number field value.
     */
    public function number(float $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? $this->faker->randomFloat(2, 0, 1000),
        ]);
    }

    /**
     * Create a date field value.
     */
    public function date($date = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $date ?? $this->faker->date(),
        ]);
    }

    /**
     * Create a datetime field value.
     */
    public function datetime($datetime = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $datetime ?? $this->faker->dateTime()->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Create a boolean field value.
     */
    public function boolean(bool $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? $this->faker->boolean(),
        ]);
    }

    /**
     * Create a select field value.
     */
    public function select(string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? 'option1',
        ]);
    }

    /**
     * Create a multiselect field value.
     */
    public function multiselect(array $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $value ?? ['tag1', 'tag2'],
        ]);
    }

    /**
     * Create a file field value.
     */
    public function file(array $fileData = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $fileData ?? [
                'name' => $this->faker->words(2, true) . '.' . $this->faker->fileExtension(),
                'size' => $this->faker->numberBetween(1000, 100000),
                'url' => $this->faker->url(),
                'type' => $this->faker->mimeType(),
            ],
        ]);
    }

    /**
     * Create a user field value.
     */
    public function user($userId = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $userId ?? ($this->faker->boolean(70) ? $this->faker->uuid() : null),
        ]);
    }

    /**
     * Create an empty/null field value.
     */
    public function empty(): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => null,
        ]);
    }

    /**
     * Create a field value with estimated hours.
     */
    public function estimatedHours(float $hours = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $hours ?? $this->faker->randomFloat(1, 1, 40),
        ]);
    }

    /**
     * Create a field value with actual hours.
     */
    public function actualHours(float $hours = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $hours ?? $this->faker->randomFloat(1, 0, 50),
        ]);
    }

    /**
     * Create a field value with progress percentage.
     */
    public function progress(int $percentage = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $percentage ?? $this->faker->numberBetween(0, 100),
        ]);
    }

    /**
     * Create a field value with priority.
     */
    public function priority(string $priority = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $priority ?? $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
        ]);
    }

    /**
     * Create a field value with status.
     */
    public function status(string $status = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $status ?? $this->faker->randomElement(['todo', 'in_progress', 'review', 'done']),
        ]);
    }

    /**
     * Create a set of common field values for a task.
     */
    public static function createCommonValues(Task $task): array
    {
        $values = [];
        $board = $task->board;

        // Get or create common columns
        $statusColumn = $board->columns()->where('type', 'select')->where('name', 'Status')->first()
            ?? BoardColumn::factory()->status()->forBoard($board)->create();
        $priorityColumn = $board->columns()->where('type', 'select')->where('name', 'Priority')->first()
            ?? BoardColumn::factory()->priority()->forBoard($board)->create();
        $assigneeColumn = $board->columns()->where('type', 'user')->where('name', 'Assignee')->first()
            ?? BoardColumn::factory()->assignee()->forBoard($board)->create();
        $dueDateColumn = $board->columns()->where('type', 'date')->where('name', 'Due Date')->first()
            ?? BoardColumn::factory()->dueDate()->forBoard($board)->create();
        $descriptionColumn = $board->columns()->where('type', 'textarea')->where('name', 'Description')->first()
            ?? BoardColumn::factory()->textarea(['name' => 'Description'])->forBoard($board)->create();

        // Create values
        $values[] = static::factory()->forTask($task)->forColumn($statusColumn)->status()->create();
        $values[] = static::factory()->forTask($task)->forColumn($priorityColumn)->priority()->create();
        $values[] = static::factory()->forTask($task)->forColumn($assigneeColumn)->user($task->assignee_id)->create();

        if ($task->due_date) {
            $values[] = static::factory()->forTask($task)->forColumn($dueDateColumn)->date($task->due_date->format('Y-m-d'))->create();
        }

        if ($task->description) {
            $values[] = static::factory()->forTask($task)->forColumn($descriptionColumn)->textarea($task->description)->create();
        }

        return $values;
    }

    /**
     * Create a complete set of field values for all columns in a board.
     */
    public static function createValuesForAllColumns(Task $task): array
    {
        $values = [];
        $columns = $task->board->columns;

        foreach ($columns as $column) {
            // Skip title column as it's handled by the task model
            if ($column->name === 'Title' && $column->type === 'text') {
                continue;
            }

            // Check if a value already exists for this task and column
            $existing = TaskFieldValue::where('task_id', $task->id)
                ->where('board_column_id', $column->id)
                ->first();

            if (!$existing) {
                $values[] = static::factory()->forTask($task)->forColumn($column)->create();
            } else {
                $values[] = $existing;
            }
        }

        return $values;
    }
}