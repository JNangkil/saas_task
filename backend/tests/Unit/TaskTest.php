<?php

namespace Tests\Unit;

use App\Http\Controllers\TaskController;
use App\Http\Resources\TaskResource;
use App\Models\Board;
use App\Models\Label;
use App\Models\Task;
use App\Models\TaskCustomValue;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Tenant;
use App\Services\TaskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    protected TaskService $taskService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->taskService = new TaskService();
    }

    /** @test */
    public function it_can_create_a_task()
    {
        $workspace = Workspace::factory()->create();
        $board = Board::factory()->create(['workspace_id' => $workspace->id]);
        $user = User::factory()->create(['tenant_id' => $workspace->tenant_id]);

        $taskData = [
            'title' => 'Test Task',
            'description' => 'This is a test task description',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => $user->id,
            'due_date' => now()->addDays(7)->toIso8601String(),
        ];

        $task = $this->taskService->createTask($board, $taskData, $user);

        $this->assertInstanceOf(Task::class, $task);
        $this->assertEquals('Test Task', $task->title);
        $this->assertEquals('This is a test task description', $task->description);
        $this->assertEquals('todo', $task->status);
        $this->assertEquals('medium', $task->priority);
        $this->assertEquals($user->id, $task->assignee_id);
        $this->assertEquals($user->id, $task->creator_id);
        $this->assertEquals($board->id, $task->board_id);
        $this->assertEquals($workspace->id, $task->workspace_id);
        $this->assertNotNull($task->position);
    }

    /** @test */
    public function it_can_update_a_task()
    {
        $task = Task::factory()->create();
        $user = User::factory()->create(['tenant_id' => $task->tenant_id]);

        $updateData = [
            'title' => 'Updated Task Title',
            'status' => 'in_progress',
            'priority' => 'high',
        ];

        $updatedTask = $this->taskService->updateTask($task, $updateData, $user);

        $this->assertEquals('Updated Task Title', $updatedTask->title);
        $this->assertEquals('in_progress', $updatedTask->status);
        $this->assertEquals('high', $updatedTask->priority);
    }

    /** @test */
    public function it_can_delete_a_task()
    {
        $task = Task::factory()->create();
        $user = User::factory()->create(['tenant_id' => $task->tenant_id]);

        $result = $this->taskService->deleteTask($task, $user);

        $this->assertTrue($result);
        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }

    /** @test */
    public function it_can_archive_a_task()
    {
        $task = Task::factory()->create();
        $user = User::factory()->create(['tenant_id' => $task->tenant_id]);

        $archivedTask = $this->taskService->archiveTask($task, $user);

        $this->assertEquals('archived', $archivedTask->status);
        $this->assertNotNull($archivedTask->archived_at);
    }

    /** @test */
    public function it_can_restore_an_archived_task()
    {
        $task = Task::factory()->archived()->create();
        $user = User::factory()->create(['tenant_id' => $task->tenant_id]);

        $restoredTask = $this->taskService->restoreTask($task, $user);

        $this->assertNotEquals('archived', $restoredTask->status);
        $this->assertNull($restoredTask->archived_at);
    }

    /** @test */
    public function it_can_duplicate_a_task()
    {
        $task = Task::factory()->create([
            'title' => 'Original Task',
            'description' => 'Original description',
            'status' => 'todo',
            'priority' => 'high',
        ]);

        // Add custom values
        TaskCustomValue::factory()->count(3)->create(['task_id' => $task->id]);

        $user = User::factory()->create(['tenant_id' => $task->tenant_id]);

        $duplicatedTask = $this->taskService->duplicateTask($task, $user);

        $this->assertNotNull($duplicatedTask);
        $this->assertNotEquals($task->id, $duplicatedTask->id);
        $this->assertStringContains('Copy of', $duplicatedTask->title);
        $this->assertEquals($task->description, $duplicatedTask->description);
        $this->assertEquals('todo', $duplicatedTask->status); // Reset to todo
        $this->assertEquals($task->priority, $duplicatedTask->priority);
        $this->assertEquals($task->board_id, $duplicatedTask->board_id);
        $this->assertEquals($task->assignee_id, $duplicatedTask->assignee_id);

        // Check that custom values were duplicated
        $this->assertEquals(
            $task->customValues()->count(),
            $duplicatedTask->customValues()->count()
        );
    }

    /** @test */
    public function it_can_reorder_tasks()
    {
        $board = Board::factory()->create();
        $tasks = Task::factory()->count(3)->create([
            'board_id' => $board->id,
            'position' => [1000, 2000, 3000],
        ]);

        $newOrder = [
            ['id' => $tasks[2]->id, 'position' => 1100],
            ['id' => $tasks[0]->id, 'position' => 1200],
            ['id' => $tasks[1]->id, 'position' => 1300],
        ];

        $this->taskService->reorderTasks($board, $newOrder);

        $tasks->each(function ($task) use ($newOrder) {
            $task->refresh();
            $newPosition = collect($newOrder)->firstWhere('id', $task->id)['position'];
            $this->assertEquals($newPosition, $task->position);
        });
    }

    /** @test */
    public function it_can_mark_task_as_completed()
    {
        $task = Task::factory()->create(['status' => 'in_progress']);

        $task->markAsCompleted();

        $this->assertEquals('done', $task->status);
        $this->assertNotNull($task->completed_at);
    }

    /** @test */
    public function it_has_proper_relationships()
    {
        $task = Task::factory()->create();
        $labels = Label::factory()->count(3)->create(['workspace_id' => $task->workspace_id]);
        $task->labels()->attach($labels->pluck('id'));

        // Test relationships
        $this->assertInstanceOf(Board::class, $task->board);
        $this->assertInstanceOf(Workspace::class, $task->workspace);
        $this->assertInstanceOf(Tenant::class, $task->tenant);
        $this->assertInstanceOf(User::class, $task->assignee);
        $this->assertInstanceOf(User::class, $task->creator);

        // Test many-to-many relationship
        $this->assertCount(3, $task->labels);
        $task->labels->each(function ($label) {
            $this->assertInstanceOf(Label::class, $label);
        });

        // Test custom values
        TaskCustomValue::factory()->count(2)->create(['task_id' => $task->id]);
        $this->assertCount(2, $task->customValues);
    }

    /** @test */
    public function it_can_scope_tasks_by_status()
    {
        Task::factory()->todo()->count(3)->create();
        Task::factory()->inProgress()->count(2)->create();
        Task::factory()->completed()->count(4)->create();

        $this->assertEquals(3, Task::withStatus('todo')->count());
        $this->assertEquals(2, Task::withStatus('in_progress')->count());
        $this->assertEquals(4, Task::withStatus('done')->count());
    }

    /** @test */
    public function it_can_scope_tasks_by_priority()
    {
        Task::factory()->lowPriority()->count(2)->create();
        Task::factory()->mediumPriority()->count(3)->create();
        Task::factory()->highPriority()->count(1)->create();
        Task::factory()->urgent()->count(1)->create();

        $this->assertEquals(2, Task::withPriority('low')->count());
        $this->assertEquals(3, Task::withPriority('medium')->count());
        $this->assertEquals(1, Task::withPriority('high')->count());
        $this->assertEquals(1, Task::withPriority('urgent')->count());
    }

    /** @test */
    public function it_can_scope_tasks_by_assignee()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Task::factory()->count(3)->create(['assignee_id' => $user1->id]);
        Task::factory()->count(2)->create(['assignee_id' => $user2->id]);
        Task::factory()->count(1)->create(['assignee_id' => null]);

        $this->assertEquals(3, Task::assignedTo($user1->id)->count());
        $this->assertEquals(2, Task::assignedTo($user2->id)->count());
    }

    /** @test */
    public function it_can_scope_tasks_by_board()
    {
        $board1 = Board::factory()->create();
        $board2 = Board::factory()->create();

        Task::factory()->count(3)->create(['board_id' => $board1->id]);
        Task::factory()->count(2)->create(['board_id' => $board2->id]);

        $this->assertEquals(3, Task::inBoard($board1->id)->count());
        $this->assertEquals(2, Task::inBoard($board2->id)->count());
    }

    /** @test */
    public function it_can_scope_active_tasks()
    {
        Task::factory()->count(5)->create(['archived_at' => null]);
        Task::factory()->count(3)->archived()->create();

        $this->assertEquals(5, Task::active()->count());
        $this->assertEquals(3, Task::archived()->count());
    }

    /** @test */
    public function it_can_create_task_using_factory()
    {
        $task = Task::factory()->create();

        $this->assertInstanceOf(Task::class, $task);
        $this->assertNotNull($task->title);
        $this->assertNotNull($task->status);
        $this->assertNotNull($task->priority);
        $this->assertNotNull($task->board_id);
        $this->assertNotNull($task->workspace_id);
        $this->assertNotNull($task->tenant_id);
    }

    /** @test */
    public function it_can_create_task_with_specific_status()
    {
        $todoTask = Task::factory()->todo()->create();
        $inProgressTask = Task::factory()->inProgress()->create();
        $completedTask = Task::factory()->completed()->create();

        $this->assertEquals('todo', $todoTask->status);
        $this->assertEquals('in_progress', $inProgressTask->status);
        $this->assertEquals('done', $completedTask->status);
        $this->assertNotNull($completedTask->completed_at);
    }

    /** @test */
    public function it_can_create_task_with_specific_priority()
    {
        $lowTask = Task::factory()->lowPriority()->create();
        $mediumTask = Task::factory()->mediumPriority()->create();
        $highTask = Task::factory()->highPriority()->create();
        $urgentTask = Task::factory()->urgent()->create();

        $this->assertEquals('low', $lowTask->priority);
        $this->assertEquals('medium', $mediumTask->priority);
        $this->assertEquals('high', $highTask->priority);
        $this->assertEquals('urgent', $urgentTask->priority);
    }

    /** @test */
    public function it_can_create_overdue_task()
    {
        $overdueTask = Task::factory()->overdue()->create();

        $this->assertLessThan(now(), $overdueTask->due_date);
        $this->assertContains($overdueTask->status, ['todo', 'in_progress']);
    }

    /** @test */
    public function it_can_create_task_for_specific_board()
    {
        $board = Board::factory()->create();
        $task = Task::factory()->forBoard($board)->create();

        $this->assertEquals($board->id, $task->board_id);
        $this->assertEquals($board->workspace_id, $task->workspace_id);
        $this->assertEquals($board->workspace->tenant_id, $task->tenant_id);
    }

    /** @test */
    public function it_can_create_unassigned_task()
    {
        $task = Task::factory()->unassigned()->create();

        $this->assertNull($task->assignee_id);
    }

    /** @test */
    public function it_validates_due_date_is_after_start_date()
    {
        $task = Task::factory()->make([
            'start_date' => now()->addDays(5),
            'due_date' => now()->addDays(2), // Due date before start date
        ]);

        $this->assertFalse($task->isValidDateRange());
    }

    /** @test */
    public function it_calculates_task_duration()
    {
        $task = Task::factory()->create([
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        $this->assertEquals(5, $task->getDurationInDays());
    }

    /** @test */
    public function it_checks_if_task_is_overdue()
    {
        $overdueTask = Task::factory()->create([
            'due_date' => now()->subDays(2),
            'status' => 'todo',
        ]);

        $upcomingTask = Task::factory()->create([
            'due_date' => now()->addDays(2),
            'status' => 'todo',
        ]);

        $completedTask = Task::factory()->create([
            'due_date' => now()->subDays(2),
            'status' => 'done',
        ]);

        $this->assertTrue($overdueTask->isOverdue());
        $this->assertFalse($upcomingTask->isOverdue());
        $this->assertFalse($completedTask->isOverdue()); // Completed tasks are not overdue
    }

    /** @test */
    public function it_returns_resource_format()
    {
        $task = Task::factory()->create();
        $resource = new TaskResource($task);

        $this->assertEquals($task->id, $resource->id);
        $this->assertEquals($task->title, $resource->title);
        $this->assertEquals($task->status, $resource->status);
        $this->assertEquals($task->priority, $resource->priority);
    }

    /** @test */
    public function it_handles_soft_deletes()
    {
        $task = Task::factory()->create();
        $taskId = $task->id;

        $task->delete();

        $this->assertSoftDeleted('tasks', ['id' => $taskId]);
        $this->assertNotNull($task->deleted_at);

        // Task should not appear in regular queries
        $this->assertEquals(0, Task::where('id', $taskId)->count());

        // But should appear withTrashed
        $this->assertEquals(1, Task::withTrashed()->where('id', $taskId)->count());
    }
}