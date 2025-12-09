<?php

namespace Tests\Feature\Analytics;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Workspace;
use App\Models\Board;
use App\Models\Task;
use App\Services\AnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    private AnalyticsService $analyticsService;
    private User $user;
    private Tenant $tenant;
    private Workspace $workspace;
    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->analyticsService = new AnalyticsService();

        $this->user = User::factory()->create();
        $this->tenant = Tenant::factory()->create();
        $this->workspace = Workspace::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);

        $this->workspace->users()->attach($this->user->id, ['role' => 'member']);
    }

    public function test_get_workspace_summary_returns_correct_metrics(): void
    {
        // Create tasks with different statuses
        Task::factory()->count(5)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'todo',
            'priority' => 'medium'
        ]);

        Task::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'in_progress',
            'priority' => 'high'
        ]);

        Task::factory()->count(2)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'done',
            'priority' => 'urgent',
            'completed_at' => now()->subDays(2)
        ]);

        Task::factory()->count(1)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'todo',
            'priority' => 'low',
            'due_date' => now()->subDays(1)
        ]);

        $summary = $this->analyticsService->getWorkspaceSummary($this->workspace);

        $this->assertEquals(11, $summary['total_tasks']);
        $this->assertEquals(2, $summary['completed_tasks']);
        $this->assertEquals(5, $summary['pending_tasks']);
        $this->assertEquals(3, $summary['in_progress_tasks']);
        $this->assertEquals(1, $summary['overdue_tasks']);
        $this->assertEquals(18.18, round($summary['completion_rate'], 2));
        $this->assertArrayHasKey('average_cycle_time', $summary);
        $this->assertArrayHasKey('tasks_by_priority', $summary);
        $this->assertArrayHasKey('tasks_by_status', $summary);
    }

    public function test_get_board_summary_returns_correct_metrics(): void
    {
        // Create tasks for the board
        Task::factory()->count(3)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'status' => 'todo'
        ]);

        Task::factory()->count(2)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'status' => 'done',
            'completed_at' => now()->subDays(1)
        ]);

        $summary = $this->analyticsService->getBoardSummary($this->board);

        $this->assertEquals(5, $summary['total_tasks']);
        $this->assertEquals(2, $summary['completed_tasks']);
        $this->assertEquals(3, $summary['pending_tasks']);
        $this->assertEquals(0, $summary['in_progress_tasks']);
        $this->assertEquals(40.0, $summary['completion_rate']);
    }

    public function test_get_user_productivity_returns_user_metrics(): void
    {
        $user2 = User::factory()->create();
        $this->workspace->users()->attach($user2->id, ['role' => 'member']);

        // Create tasks for first user
        Task::factory()->count(5)->create([
            'workspace_id' => $this->workspace->id,
            'assignee_id' => $this->user->id,
            'status' => 'todo'
        ]);

        Task::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'assignee_id' => $this->user->id,
            'status' => 'done',
            'completed_at' => now()->subDays(2)
        ]);

        // Create tasks for second user
        Task::factory()->count(2)->create([
            'workspace_id' => $this->workspace->id,
            'assignee_id' => $user2->id,
            'status' => 'done',
            'completed_at' => now()->subDays(1)
        ]);

        $productivity = $this->analyticsService->getUserProductivity($this->workspace);

        $this->assertCount(2, $productivity);

        // First user metrics
        $user1Metrics = collect($productivity)->firstWhere('user.id', $this->user->id);
        $this->assertEquals(8, $user1Metrics['total_tasks']);
        $this->assertEquals(3, $user1Metrics['completed_tasks']);
        $this->assertEquals(37.5, $user1Metrics['completion_rate']);

        // Second user metrics
        $user2Metrics = collect($productivity)->firstWhere('user.id', $user2->id);
        $this->assertEquals(2, $user2Metrics['total_tasks']);
        $this->assertEquals(2, $user2Metrics['completed_tasks']);
        $this->assertEquals(100.0, $user2Metrics['completion_rate']);
    }

    public function test_get_activity_trends_returns_daily_data(): void
    {
        $startDate = now()->subDays(3);
        $endDate = now();

        // Create tasks with different creation dates
        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => $startDate,
            'status' => 'done',
            'completed_at' => $startDate->addHours(5)
        ]);

        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => $startDate->copy()->addDay(),
            'status' => 'done',
            'completed_at' => $startDate->copy()->addDay()->addHours(10)
        ]);

        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now(),
            'status' => 'todo'
        ]);

        $trends = $this->analyticsService->getActivityTrends($this->workspace, $startDate, $endDate);

        $this->assertCount(4, $trends); // 3 days + today

        // Check first day
        $firstDay = $trends[0];
        $this->assertEquals($startDate->format('Y-m-d'), $firstDay['date']);
        $this->assertEquals(1, $firstDay['created']);
        $this->assertEquals(1, $firstDay['completed']);

        // Check last day (today)
        $lastDay = $trends[3];
        $this->assertEquals(now()->format('Y-m-d'), $lastDay['date']);
        $this->assertEquals(1, $lastDay['created']);
    }

    public function test_calculate_average_cycle_time(): void
    {
        // Create completed tasks with different cycle times
        $task1 = Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'done',
            'created_at' => now()->subDays(5),
            'completed_at' => now()->subDays(3)
        ]);

        $task2 = Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'done',
            'created_at' => now()->subDays(10),
            'completed_at' => now()->subDays(6)
        ]);

        $task3 = Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'todo' // Not completed
        ]);

        $summary = $this->analyticsService->getWorkspaceSummary($this->workspace);

        // Average cycle time should be (2 + 4) / 2 = 3 days
        $this->assertEquals(3.0, $summary['average_cycle_time']);
    }

    public function test_date_range_filtering(): void
    {
        $startDate = now()->subDays(5);
        $endDate = now()->subDays(2);

        // Create tasks within date range
        Task::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDays(3),
            'status' => 'done'
        ]);

        // Create tasks outside date range
        Task::factory()->count(2)->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDays(10),
            'status' => 'done'
        ]);

        Task::factory()->count(1)->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDay(),
            'status' => 'done'
        ]);

        $summary = $this->analyticsService->getWorkspaceSummary($this->workspace, $startDate, $endDate);

        // Should only include tasks within date range
        $this->assertEquals(3, $summary['total_tasks']);
        $this->assertEquals(3, $summary['completed_tasks']);
    }
}