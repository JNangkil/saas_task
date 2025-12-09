<?php

namespace Tests\Feature\Analytics;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Workspace;
use App\Models\Board;
use App\Models\Task;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Tenant $tenant;
    private Workspace $workspace;
    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->tenant = Tenant::factory()->create();
        $this->workspace = Workspace::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);

        $this->workspace->users()->attach($this->user->id, ['role' => 'member']);
        Sanctum::actingAs($this->user);
    }

    public function test_get_workspace_summary_unauthenticated(): void
    {
        Sanctum::actingAs(null);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/summary");

        $response->assertUnauthorized();
    }

    public function test_get_workspace_summary_success(): void
    {
        Task::factory()->count(5)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'todo'
        ]);

        Task::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'done'
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/summary");

        $response->assertOk()
            ->assertJsonStructure([
                'total_tasks',
                'completed_tasks',
                'pending_tasks',
                'in_progress_tasks',
                'overdue_tasks',
                'completion_rate',
                'average_cycle_time',
                'tasks_by_priority',
                'tasks_by_status'
            ]);

        $this->assertEquals(8, $response->json('total_tasks'));
        $this->assertEquals(3, $response->json('completed_tasks'));
    }

    public function test_get_workspace_summary_with_date_filters(): void
    {
        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDays(10),
            'status' => 'done'
        ]);

        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDays(3),
            'status' => 'done'
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/summary", [
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->toDateString()
        ]);

        $response->assertOk();
        $this->assertEquals(1, $response->json('total_tasks'));
    }

    public function test_get_board_summary_success(): void
    {
        Task::factory()->count(5)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'status' => 'todo'
        ]);

        Task::factory()->count(2)->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'status' => 'done'
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/boards/{$this->board->id}/analytics/summary");

        $response->assertOk()
            ->assertJsonStructure([
                'total_tasks',
                'completed_tasks',
                'pending_tasks',
                'in_progress_tasks',
                'overdue_tasks',
                'completion_rate',
                'average_cycle_time'
            ]);

        $this->assertEquals(7, $response->json('total_tasks'));
        $this->assertEquals(2, $response->json('completed_tasks'));
    }

    public function test_get_user_productivity_success(): void
    {
        Task::factory()->count(5)->create([
            'workspace_id' => $this->workspace->id,
            'assignee_id' => $this->user->id,
            'status' => 'todo'
        ]);

        Task::factory()->count(3)->create([
            'workspace_id' => $this->workspace->id,
            'assignee_id' => $this->user->id,
            'status' => 'done'
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/user-productivity");

        $response->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'user' => [
                        'id',
                        'name',
                        'email'
                    ],
                    'total_tasks',
                    'completed_tasks',
                    'completion_rate',
                    'average_cycle_time'
                ]
            ]);

        $userProductivity = $response->json()[0];
        $this->assertEquals($this->user->id, $userProductivity['user']['id']);
        $this->assertEquals(8, $userProductivity['total_tasks']);
        $this->assertEquals(3, $userProductivity['completed_tasks']);
    }

    public function test_get_activity_trends_success(): void
    {
        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'created_at' => now()->subDays(2),
            'status' => 'done',
            'completed_at' => now()->subDays(2)->addHours(5)
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/trends", [
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->toDateString()
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'date',
                    'created',
                    'completed'
                ]
            ]);
    }

    public function test_get_activity_trends_requires_dates(): void
    {
        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/trends");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_date', 'end_date']);
    }

    public function test_export_workspace_csv_success(): void
    {
        Task::factory()->create([
            'workspace_id' => $this->workspace->id,
            'status' => 'done'
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/export/csv");

        $response->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=utf-8')
            ->assertHeader('content-disposition');
    }

    public function test_clear_workspace_cache_success(): void
    {
        $response = $this->deleteJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/cache");

        $response->assertOk()
            ->assertJson([
                'message' => 'Analytics cache cleared successfully'
            ]);
    }

    public function test_clear_board_cache_success(): void
    {
        $response = $this->deleteJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/boards/{$this->board->id}/analytics/cache");

        $response->assertOk()
            ->assertJson([
                'message' => 'Analytics cache cleared successfully'
            ]);
    }

    public function test_unauthorized_user_cannot_access_analytics(): void
    {
        // Create a user not associated with the workspace
        $unauthorizedUser = User::factory()->create();
        Sanctum::actingAs($unauthorizedUser);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/analytics/summary");

        $response->assertForbidden();
    }
}