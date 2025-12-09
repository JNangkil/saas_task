<?php

namespace Tests\Unit;

use App\Http\Controllers\TaskBulkOperationController;
use App\Http\Requests\TaskBulkAssignRequest;
use App\Http\Requests\TaskBulkArchiveRequest;
use App\Http\Requests\TaskBulkDeleteRequest;
use App\Http\Requests\TaskBulkMoveRequest;
use App\Http\Requests\TaskBulkSetStatusRequest;
use App\Http\Requests\TaskBulkUpdateRequest;
use App\Jobs\ProcessBulkTaskOperation;
use App\Models\Board;
use App\Models\Label;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Tenant;
use App\Services\TaskBulkOperationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class TaskBulkOperationTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $workspace;
    protected $board;
    protected $targetBoard;
    protected $user;
    protected $assignee;
    protected $tasks;
    protected $bulkOperationService;
    protected $controller;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->workspace = Workspace::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);
        $this->targetBoard = Board::factory()->create(['workspace_id' => $this->workspace->id]);

        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->assignee = User::factory()->create(['tenant_id' => $this->tenant->id]);

        // Add users to workspace
        $this->workspace->users()->attach($this->user->id, ['role' => 'owner']);
        $this->workspace->users()->attach($this->assignee->id, ['role' => 'member']);

        // Create tasks
        $this->tasks = Task::factory()->count(5)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'creator_id' => $this->user->id,
        ]);

        $this->bulkOperationService = app(TaskBulkOperationService::class);
        $this->controller = new TaskBulkOperationController($this->bulkOperationService);
    }

    /** @test */
    public function it_can_bulk_update_tasks()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();
        $updateData = [
            'status' => 'done',
            'priority' => 'high',
            'assignee_id' => $this->assignee->id,
        ];

        $response = $this->controller->bulkUpdate(
            new TaskBulkUpdateRequest(['task_ids' => $taskIds, 'updates' => $updateData]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks were updated
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals('done', $task->status);
            $this->assertEquals('high', $task->priority);
            $this->assertEquals($this->assignee->id, $task->assignee_id);
        }
    }

    /** @test */
    public function it_can_bulk_move_tasks_to_another_board()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkMove(
            new TaskBulkMoveRequest([
                'task_ids' => $taskIds,
                'target_board_id' => $this->targetBoard->id
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks were moved
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals($this->targetBoard->id, $task->board_id);
        }
    }

    /** @test */
    public function it_can_bulk_archive_tasks()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkArchive(
            new TaskBulkArchiveRequest(['task_ids' => $taskIds]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks were archived
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals('archived', $task->status);
            $this->assertNotNull($task->archived_at);
        }
    }

    /** @test */
    public function it_can_bulk_delete_tasks()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkDelete(
            new TaskBulkDeleteRequest(['task_ids' => $taskIds]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks were soft deleted
        foreach ($taskIds as $taskId) {
            $this->assertSoftDeleted('tasks', ['id' => $taskId]);
        }
    }

    /** @test */
    public function it_can_bulk_assign_tasks_to_user()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkAssign(
            new TaskBulkAssignRequest([
                'task_ids' => $taskIds,
                'assignee_id' => $this->assignee->id
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks were assigned
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals($this->assignee->id, $task->assignee_id);
        }
    }

    /** @test */
    public function it_can_bulk_set_task_status()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkSetStatus(
            new TaskBulkSetStatusRequest([
                'task_ids' => $taskIds,
                'status' => 'in_progress'
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks status was set
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals('in_progress', $task->status);
        }
    }

    /** @test */
    public function it_can_bulk_set_task_priority()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkSetPriority(
            new \App\Http\Requests\TaskBulkSetPriorityRequest([
                'task_ids' => $taskIds,
                'priority' => 'urgent'
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify tasks priority was set
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals('urgent', $task->priority);
        }
    }

    /** @test */
    public function it_can_bulk_add_labels_to_tasks()
    {
        Auth::login($this->user);

        // Create labels
        $labels = Label::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
        $labelIds = $labels->pluck('id')->toArray();

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkAddLabels(
            new \App\Http\Requests\TaskBulkManageLabelsRequest([
                'task_ids' => $taskIds,
                'label_ids' => $labelIds
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify labels were added
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertCount(3, $task->labels);
            foreach ($labelIds as $labelId) {
                $this->assertTrue($task->labels->contains($labelId));
            }
        }
    }

    /** @test */
    public function it_can_bulk_remove_labels_from_tasks()
    {
        Auth::login($this->user);

        // Create and attach labels first
        $labels = Label::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
        $labelIds = $labels->pluck('id')->toArray();

        foreach ($this->tasks as $task) {
            $task->labels()->attach($labelIds);
        }

        $taskIds = $this->tasks->pluck('id')->toArray();

        // Remove one label
        $removeLabelIds = [$labelIds[0]];

        $response = $this->controller->bulkRemoveLabels(
            new \App\Http\Requests\TaskBulkManageLabelsRequest([
                'task_ids' => $taskIds,
                'label_ids' => $removeLabelIds
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify label was removed
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertCount(2, $task->labels);
            $this->assertFalse($task->labels->contains($labelIds[0]));
            $this->assertTrue($task->labels->contains($labelIds[1]));
            $this->assertTrue($task->labels->contains($labelIds[2]));
        }
    }

    /** @test */
    public function it_can_bulk_set_due_date_for_tasks()
    {
        Auth::login($this->user);

        $taskIds = $this->tasks->pluck('id')->toArray();
        $dueDate = now()->addDays(7)->toDateString();

        $response = $this->controller->bulkSetDueDate(
            new \App\Http\Requests\TaskBulkSetDueDateRequest([
                'task_ids' => $taskIds,
                'due_date' => $dueDate
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);
        $this->assertEquals(0, $data['failed_count']);

        // Verify due date was set
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertEquals($dueDate, $task->due_date->format('Y-m-d'));
        }
    }

    /** @test */
    public function it_queues_large_bulk_operations_for_async_processing()
    {
        Auth::login($this->user);
        Bus::fake();

        // Create 15 tasks (more than the async threshold of 10)
        $manyTasks = Task::factory()->count(15)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'creator_id' => $this->user->id,
        ]);

        $taskIds = $manyTasks->pluck('id')->toArray();

        $response = $this->controller->bulkUpdate(
            new TaskBulkUpdateRequest([
                'task_ids' => $taskIds,
                'updates' => ['status' => 'done'],
                'async' => true
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(202, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertArrayHasKey('job_id', $data);
        $this->assertEquals(15, $data['task_count']);

        Bus::assertDispatched(ProcessBulkTaskOperation::class, function ($job) use ($taskIds) {
            return $job->operation === 'bulk_update' &&
                   $job->data['task_ids'] === $taskIds &&
                   $job->data['updates']['status'] === 'done';
        });
    }

    /** @test */
    public function it_prevents_bulk_operations_on_tasks_from_other_workspaces()
    {
        // Create tasks in different workspace
        $otherWorkspace = Workspace::factory()->create();
        $otherTasks = Task::factory()->count(3)->create([
            'board_id' => Board::factory()->create(['workspace_id' => $otherWorkspace->id]),
            'workspace_id' => $otherWorkspace->id,
        ]);

        Auth::login($this->user);

        // Mix of valid and invalid task IDs
        $mixedTaskIds = [
            $this->tasks->first()->id, // Valid
            $otherTasks->first()->id,  // Invalid
        ];

        $response = $this->controller->bulkUpdate(
            new TaskBulkUpdateRequest([
                'task_ids' => $mixedTaskIds,
                'updates' => ['status' => 'done']
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(404, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertStringContainsString('not found or do not belong to this workspace', $data['error']);
        $this->assertEquals([$otherTasks->first()->id], $data['invalid_task_ids']);
    }

    /** @test */
    public function it_prevents_bulk_operations_without_proper_authorization()
    {
        // Create user with member role (not owner)
        $memberUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->workspace->users()->attach($memberUser->id, ['role' => 'member']);

        // Create tasks created by owner
        $ownerTasks = Task::factory()->count(3)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
            'creator_id' => $this->user->id,
        ]);

        Auth::login($memberUser);

        $response = $this->controller->bulkDelete(
            new TaskBulkDeleteRequest(['task_ids' => $ownerTasks->pluck('id')->toArray()]),
            $this->tenant->id,
            $this->workspace->id
        );

        // Should be forbidden due to policy
        $this->assertEquals(403, $response->getStatusCode());
    }

    /** @test */
    public function it_handles_bulk_operation_failures_gracefully()
    {
        Auth::login($this->user);

        // Mock the service to throw an exception
        $mockService = $this->mock(TaskBulkOperationService::class);
        $mockService->shouldReceive('bulkUpdate')
            ->once()
            ->andThrow(new \Exception('Test error'));

        $controller = new TaskBulkOperationController($mockService);

        $response = $controller->bulkUpdate(
            new TaskBulkUpdateRequest([
                'task_ids' => $this->tasks->pluck('id')->toArray(),
                'updates' => ['status' => 'done']
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(500, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertStringContainsString('failed', $data['error']);
        $this->assertEquals('Test error', $data['message']);
    }

    /** @test */
    public function it_logs_bulk_operation_results()
    {
        Auth::login($this->user);
        Log::fake();

        $taskIds = $this->tasks->pluck('id')->toArray();

        $this->controller->bulkUpdate(
            new TaskBulkUpdateRequest([
                'task_ids' => $taskIds,
                'updates' => ['status' => 'done']
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        Log::assertLogged('info', function ($message, $context) use ($taskIds) {
            return $message === 'Bulk update completed' &&
                   $context['user_id'] === $this->user->id &&
                   $context['tenant_id'] === $this->tenant->id &&
                   $context['workspace_id'] === $this->workspace->id &&
                   $context['task_count'] === count($taskIds);
        });
    }

    /** @test */
    public function it_validates_target_board_belongs_to_workspace()
    {
        Auth::login($this->user);

        // Create board in different workspace
        $otherWorkspace = Workspace::factory()->create();
        $otherBoard = Board::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkMove(
            new TaskBulkMoveRequest([
                'task_ids' => $taskIds,
                'target_board_id' => $otherBoard->id
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(404, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertEquals('Target board not found', $data['error']);
    }

    /** @test */
    public function it_validates_assignee_belongs_to_workspace()
    {
        Auth::login($this->user);

        // Create user not in workspace
        $externalUser = User::factory()->create(['tenant_id' => $this->tenant->id]);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkAssign(
            new TaskBulkAssignRequest([
                'task_ids' => $taskIds,
                'assignee_id' => $externalUser->id
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(404, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertEquals('Assignee does not belong to this workspace', $data['error']);
    }

    /** @test */
    public function it_validates_labels_belong_to_workspace()
    {
        Auth::login($this->user);

        // Create label in different workspace
        $otherWorkspace = Workspace::factory()->create();
        $otherLabel = Label::factory()->create(['workspace_id' => $otherWorkspace->id]);

        $taskIds = $this->tasks->pluck('id')->toArray();

        $response = $this->controller->bulkAddLabels(
            new \App\Http\Requests\TaskBulkManageLabelsRequest([
                'task_ids' => $taskIds,
                'label_ids' => [$otherLabel->id]
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(404, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertStringContainsString('do not belong to this workspace', $data['error']);
        $this->assertEquals([$otherLabel->id], $data['invalid_label_ids']);
    }

    /** @test */
    public function it_allows_unassigned_in_bulk_assign()
    {
        Auth::login($this->user);

        // First assign tasks to a user
        foreach ($this->tasks as $task) {
            $task->update(['assignee_id' => $this->assignee->id]);
        }

        $taskIds = $this->tasks->pluck('id')->toArray();

        // Unassign tasks
        $response = $this->controller->bulkAssign(
            new TaskBulkAssignRequest([
                'task_ids' => $taskIds,
                'assignee_id' => null
            ]),
            $this->tenant->id,
            $this->workspace->id
        );

        $this->assertEquals(200, $response->getStatusCode());
        $data = $response->getData(true);
        $this->assertEquals(5, $data['successful_count']);

        // Verify tasks were unassigned
        foreach ($taskIds as $taskId) {
            $task = Task::find($taskId);
            $this->assertNull($task->assignee_id);
        }
    }
}