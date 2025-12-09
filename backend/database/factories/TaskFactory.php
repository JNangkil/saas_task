<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $workspace = Workspace::factory()->create();
        $board = Board::factory()->create(['workspace_id' => $workspace->id]);
        $creator = User::factory()->create(['tenant_id' => $workspace->tenant_id]);
        $assignee = $this->faker->boolean(70) ? $creator : User::factory()->create(['tenant_id' => $workspace->tenant_id]);

        return [
            'board_id' => $board->id,
            'workspace_id' => $workspace->id,
            'tenant_id' => $workspace->tenant_id,
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraphs(2, true),
            'status' => $this->faker->randomElement(['todo', 'in_progress', 'done']),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'assignee_id' => $assignee->id,
            'creator_id' => $creator->id,
            'due_date' => $this->faker->boolean(60) ? $this->faker->dateTimeBetween('now', '+30 days') : null,
            'start_date' => $this->faker->boolean(40) ? $this->faker->dateTimeBetween('-7 days', 'now') : null,
            'completed_at' => null,
            'archived_at' => null,
            'position' => $this->faker->unique()->randomFloat(4, 1, 9999),
        ];
    }

    /**
     * Indicate that the task is a todo item.
     */
    public function todo(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'todo',
            'completed_at' => null,
        ]);
    }

    /**
     * Indicate that the task is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'completed_at' => null,
        ]);
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'done',
            'completed_at' => now(),
        ]);
    }

    /**
     * Indicate that the task is archived.
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'archived',
            'archived_at' => now(),
        ]);
    }

    /**
     * Indicate that the task has low priority.
     */
    public function lowPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'low',
        ]);
    }

    /**
     * Indicate that the task has medium priority.
     */
    public function mediumPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'medium',
        ]);
    }

    /**
     * Indicate that the task has high priority.
     */
    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'high',
        ]);
    }

    /**
     * Indicate that the task has urgent priority.
     */
    public function urgent(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'urgent',
        ]);
    }

    /**
     * Indicate that the task is overdue.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => $this->faker->dateTimeBetween('-30 days', '-1 day'),
            'status' => $this->faker->randomElement(['todo', 'in_progress']),
        ]);
    }

    /**
     * Indicate that the task is due soon.
     */
    public function dueSoon(int $days = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => now()->addDays($days),
        ]);
    }

    /**
     * Indicate that the task has no due date.
     */
    public function withoutDueDate(): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => null,
        ]);
    }

    /**
     * Indicate that the task has a start date.
     */
    public function withStartDate(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_date' => $this->faker->dateTimeBetween('-7 days', 'now'),
        ]);
    }

    /**
     * Create a task for a specific board.
     */
    public function forBoard(Board $board): static
    {
        return $this->state(fn (array $attributes) => [
            'board_id' => $board->id,
            'workspace_id' => $board->workspace_id,
            'tenant_id' => $board->workspace->tenant_id,
        ]);
    }

    /**
     * Create a task for a specific workspace.
     */
    public function forWorkspace(Workspace $workspace): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $workspace->id,
            'tenant_id' => $workspace->tenant_id,
        ]);
    }

    /**
     * Create a task for a specific tenant.
     */
    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Assign the task to a specific user.
     */
    public function assignedTo(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'assignee_id' => $user->id,
        ]);
    }

    /**
     * Create a task created by a specific user.
     */
    public function createdBy(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'creator_id' => $user->id,
        ]);
    }

    /**
     * Create a task with a specific position.
     */
    public function withPosition(float $position): static
    {
        return $this->state(fn (array $attributes) => [
            'position' => $position,
        ]);
    }

    /**
     * Create a task without an assignee.
     */
    public function unassigned(): static
    {
        return $this->state(fn (array $attributes) => [
            'assignee_id' => null,
        ]);
    }

    /**
     * Create a task with a specific title.
     */
    public function withTitle(string $title): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => $title,
        ]);
    }

    /**
     * Create a task with a specific description.
     */
    public function withDescription(string $description): static
    {
        return $this->state(fn (array $attributes) => [
            'description' => $description,
        ]);
    }

    /**
     * Create a task without a description.
     */
    public function withoutDescription(): static
    {
        return $this->state(fn (array $attributes) => [
            'description' => null,
        ]);
    }

    /**
     * Create a task with a specific due date.
     */
    public function withDueDate($date): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => $date,
        ]);
    }

    /**
     * Create a task with a specific start date.
     */
    public function withStartDate($date): static
    {
        return $this->state(fn (array $attributes) => [
            'start_date' => $date,
        ]);
    }
}