<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Models\User;
use App\Models\Board;
use App\Models\Label;
use App\Models\Workspace;
use App\Http\Requests\TaskFilterRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use Tests\TestCase;

class TaskFilteringTest extends TestCase
{
    use RefreshDatabase;

    protected $workspace;
    protected $board;
    protected $users;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = Workspace::factory()->create();
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);

        // Create users for testing
        $this->users = collect([
            'user1' => User::factory()->create(['tenant_id' => $this->workspace->tenant_id]),
            'user2' => User::factory()->create(['tenant_id' => $this->workspace->tenant_id]),
            'user3' => User::factory()->create(['tenant_id' => $this->workspace->tenant_id]),
        ]);

        // Create test tasks with various attributes
        $this->createTestTasks();
    }

    protected function createTestTasks()
    {
        // Tasks with different statuses
        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Todo Task 1',
            'status' => 'todo',
            'priority' => 'low',
            'assignee_id' => $this->users['user1']->id,
            'due_date' => Carbon::parse('+5 days'),
            'position' => 1000,
        ]);

        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'In Progress Task',
            'status' => 'in_progress',
            'priority' => 'high',
            'assignee_id' => $this->users['user2']->id,
            'due_date' => Carbon::parse('+2 days'),
            'position' => 2000,
        ]);

        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Completed Task',
            'status' => 'done',
            'priority' => 'medium',
            'assignee_id' => $this->users['user3']->id,
            'due_date' => Carbon::parse('-2 days'),
            'position' => 3000,
        ]);

        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Todo Task 2 (urgent)',
            'status' => 'todo',
            'priority' => 'urgent',
            'assignee_id' => null,
            'due_date' => Carbon::parse('+1 day'),
            'position' => 4000,
        ]);

        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Another In Progress',
            'description' => 'This task has special keywords',
            'status' => 'in_progress',
            'priority' => 'medium',
            'assignee_id' => $this->users['user1']->id,
            'due_date' => Carbon::parse('+10 days'),
            'position' => 5000,
        ]);

        // Create archived task
        Task::factory()->archived()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Archived Task',
            'status' => 'archived',
            'priority' => 'low',
            'assignee_id' => $this->users['user2']->id,
            'position' => 6000,
        ]);
    }

    /** @test */
    public function it_can_filter_by_single_status()
    {
        // Filter by todo status
        $request = new TaskFilterRequest([
            'status' => 'todo'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(2, $tasks);
        $tasks->each(function ($task) {
            $this->assertEquals('todo', $task->status);
        });
    }

    /** @test */
    public function it_can_filter_by_multiple_statuses()
    {
        // Filter by multiple statuses
        $request = new TaskFilterRequest([
            'status' => ['todo', 'done']
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(3, $tasks);
        $tasks->each(function ($task) {
            $this->assertTrue(in_array($task->status, ['todo', 'done']));
        });
    }

    /** @test */
    public function it_can_filter_by_single_priority()
    {
        $request = new TaskFilterRequest([
            'priority' => 'high'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertEquals('In Progress Task', $tasks->first()->title);
    }

    /** @test */
    public function it_can_filter_by_multiple_priorities()
    {
        $request = new TaskFilterRequest([
            'priority' => ['low', 'urgent']
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(2, $tasks);
        $tasks->each(function ($task) {
            $this->assertTrue(in_array($task->priority, ['low', 'urgent']));
        });
    }

    /** @test */
    public function it_can_filter_by_assignee()
    {
        $request = new TaskFilterRequest([
            'assignee_id' => $this->users['user1']->id
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(2, $tasks);
        $tasks->each(function ($task) {
            $this->assertEquals($this->users['user1']->id, $task->assignee_id);
        });
    }

    /** @test */
    public function it_can_filter_by_unassigned_tasks()
    {
        $request = new TaskFilterRequest([
            'assignee_id' => 'unassigned'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertNull($tasks->first()->assignee_id);
    }

    /** @test */
    public function it_can_filter_by_due_date_range()
    {
        $request = new TaskFilterRequest([
            'due_from' => Carbon::parse('+3 days')->toDateString(),
            'due_to' => Carbon::parse('+7 days')->toDateString(),
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertEquals('Todo Task 1', $tasks->first()->title);
    }

    /** @test */
    public function it_can_filter_by_overdue_tasks()
    {
        $request = new TaskFilterRequest([
            'overdue' => true,
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertEquals('Completed Task', $tasks->first()->title);
    }

    /** @test */
    public function it_can_search_by_keyword_in_title()
    {
        $request = new TaskFilterRequest([
            'search' => 'urgent'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertStringContainsString('urgent', $tasks->first()->title);
    }

    /** @test */
    public function it_can_search_by_keyword_in_description()
    {
        $request = new TaskFilterRequest([
            'search' => 'special'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertEquals('Another In Progress', $tasks->first()->title);
    }

    /** @test */
    public function it_can_search_by_partial_keyword()
    {
        $request = new TaskFilterRequest([
            'search' => 'prog'
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(2, $tasks);
        $tasks->each(function ($task) {
            $this->assertTrue(
                stripos($task->title, 'prog') !== false ||
                stripos($task->description, 'prog') !== false
            );
        });
    }

    /** @test */
    public function it_can_sort_by_position_ascending()
    {
        $request = new TaskFilterRequest([
            'sort' => 'position',
            'order' => 'asc',
        ]);

        $tasks = Task::filter($request)->active()->get();

        $positions = $tasks->pluck('position')->toArray();
        $sortedPositions = $positions;
        sort($sortedPositions);

        $this->assertEquals($sortedPositions, $positions);
    }

    /** @test */
    public function it_can_sort_by_position_descending()
    {
        $request = new TaskFilterRequest([
            'sort' => 'position',
            'order' => 'desc',
        ]);

        $tasks = Task::filter($request)->active()->get();

        $positions = $tasks->pluck('position')->toArray();
        $sortedPositions = $positions;
        rsort($sortedPositions);

        $this->assertEquals($sortedPositions, $positions);
    }

    /** @test */
    public function it_can_sort_by_created_at()
    {
        // Create tasks with specific creation times
        $firstTask = Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'created_at' => Carbon::parse('-5 days'),
        ]);

        $secondTask = Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'created_at' => Carbon::parse('-2 days'),
        ]);

        $request = new TaskFilterRequest([
            'sort' => 'created_at',
            'order' => 'asc',
        ]);

        $tasks = Task::filter($request)->whereIn('id', [$firstTask->id, $secondTask->id])->get();

        $this->assertEquals($firstTask->id, $tasks->first()->id);
        $this->assertEquals($secondTask->id, $tasks->last()->id);
    }

    /** @test */
    public function it_can_sort_by_due_date()
    {
        $request = new TaskFilterRequest([
            'sort' => 'due_date',
            'order' => 'asc',
        ]);

        $tasks = Task::filter($request)->active()->whereNotNull('due_date')->get();

        $dueDates = $tasks->pluck('due_date')->toArray();
        $sortedDates = $dueDates;
        sort($sortedDates);

        $this->assertEquals($sortedDates, $dueDates);
    }

    /** @test */
    public function it_can_sort_by_priority()
    {
        // Create tasks with all priorities
        $priorityOrder = ['urgent' => 4, 'high' => 3, 'medium' => 2, 'low' => 1];

        $request = new TaskFilterRequest([
            'sort' => 'priority',
            'order' => 'desc',
        ]);

        $tasks = Task::filter($request)->active()->get();

        $previousPriority = 5; // Start higher than any priority
        $tasks->each(function ($task) use (&$previousPriority, $priorityOrder) {
            $currentPriority = $priorityOrder[$task->priority];
            $this->assertLessThanOrEqual($previousPriority, $currentPriority);
            $previousPriority = $currentPriority;
        });
    }

    /** @test */
    public function it_can_include_archived_tasks()
    {
        $request = new TaskFilterRequest([
            'include_archived' => true,
        ]);

        $tasks = Task::filter($request)->get();

        // Should include the archived task
        $this->assertTrue($tasks->contains('status', 'archived'));
        $this->assertCount(6, $tasks); // 5 active + 1 archived
    }

    /** @test */
    public function it_excludes_archived_tasks_by_default()
    {
        $request = new TaskFilterRequest([]);

        $tasks = Task::filter($request)->get();

        // Should not include archived tasks
        $this->assertFalse($tasks->contains('status', 'archived'));
        $this->assertCount(5, $tasks); // Only active tasks
    }

    /** @test */
    public function it_can_apply_multiple_filters()
    {
        $request = new TaskFilterRequest([
            'status' => 'todo',
            'priority' => 'low',
            'assignee_id' => $this->users['user1']->id,
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $task = $tasks->first();

        $this->assertEquals('todo', $task->status);
        $this->assertEquals('low', $task->priority);
        $this->assertEquals($this->users['user1']->id, $task->assignee_id);
    }

    /** @test */
    public function it_can_filter_by_labels()
    {
        // Create labels
        $bugLabel = Label::factory()->create([
            'workspace_id' => $this->workspace->id,
            'name' => 'Bug',
            'color' => '#ff0000',
        ]);

        $featureLabel = Label::factory()->create([
            'workspace_id' => $this->workspace->id,
            'name' => 'Feature',
            'color' => '#00ff00',
        ]);

        // Get a task and attach labels
        $task = Task::where('status', 'todo')->first();
        $task->labels()->attach([$bugLabel->id, $featureLabel->id]);

        $request = new TaskFilterRequest([
            'labels' => [$bugLabel->id],
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(1, $tasks);
        $this->assertTrue($tasks->first()->labels->contains($bugLabel));
    }

    /** @test */
    public function it_can_filter_by_multiple_labels()
    {
        // Create labels
        $labels = Label::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
        ]);

        // Get tasks and attach labels
        $task1 = Task::where('status', 'todo')->first();
        $task1->labels()->attach([$labels[0]->id, $labels[1]->id]);

        $task2 = Task::where('status', 'in_progress')->first();
        $task2->labels()->attach([$labels[1]->id, $labels[2]->id]);

        // Filter for tasks that have ANY of the specified labels
        $request = new TaskFilterRequest([
            'labels' => [$labels[0]->id, $labels[2]->id],
        ]);

        $tasks = Task::filter($request)->get();

        $this->assertCount(2, $tasks);
        $this->assertTrue($tasks->contains('id', $task1->id));
        $this->assertTrue($tasks->contains('id', $task2->id));
    }

    /** @test */
    public function it_can_filter_by_date_range_with_null_due_dates()
    {
        // Create a task without due date
        Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'due_date' => null,
        ]);

        $request = new TaskFilterRequest([
            'due_from' => null,
            'due_to' => Carbon::parse('+3 days')->toDateString(),
        ]);

        $tasks = Task::filter($request)->get();

        // Should include tasks with no due date and tasks due before the end date
        $this->assertTrue($tasks->contains('due_date', null));
    }

    /** @test */
    public function it_handles_empty_filter_request()
    {
        $request = new TaskFilterRequest([]);

        $tasks = Task::filter($request)->get();

        // Should return all active tasks by default
        $this->assertCount(5, $tasks);
        $tasks->each(function ($task) {
            $this->assertNull($task->archived_at);
        });
    }

    /** @test */
    public function it_validates_date_format_in_filter()
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        new TaskFilterRequest([
            'due_from' => 'invalid-date',
        ]);
    }

    /** @test */
    public function it_handles_pagination_with_filters()
    {
        // Create more tasks for pagination testing
        Task::factory()->count(20)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'status' => 'todo',
        ]);

        $request = new TaskFilterRequest([
            'status' => 'todo',
            'per_page' => 5,
            'page' => 1,
        ]);

        $tasks = Task::filter($request)->paginate($request->per_page);

        $this->assertCount(5, $tasks->items());
        $this->assertTrue($tasks->hasMorePages());
    }
}