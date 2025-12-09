<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Tenant;
use App\Models\Board;
use App\Policies\TaskPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant1;
    protected $tenant2;
    protected $workspace1;
    protected $workspace2;
    protected $board1;
    protected $board2;
    protected $member;
    protected $owner;
    protected $externalUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create two tenants
        $this->tenant1 = Tenant::factory()->create();
        $this->tenant2 = Tenant::factory()->create();

        // Create workspaces for each tenant
        $this->workspace1 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->workspace2 = Workspace::factory()->create(['tenant_id' => $this->tenant2->id]);

        // Create boards for each workspace
        $this->board1 = Board::factory()->create(['workspace_id' => $this->workspace1->id]);
        $this->board2 = Board::factory()->create(['workspace_id' => $this->workspace2->id]);

        // Create users
        $this->owner = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->member = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->externalUser = User::factory()->create(['tenant_id' => $this->tenant2->id]);

        // Add users to workspaces with different roles
        $this->workspace1->users()->attach($this->owner->id, ['role' => 'owner']);
        $this->workspace1->users()->attach($this->member->id, ['role' => 'member']);
        $this->workspace2->users()->attach($this->externalUser->id, ['role' => 'member']);
    }

    /** @test */
    public function owner_can_view_any_task_in_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->viewAny($this->owner, $this->workspace1));
    }

    /** @test */
    public function member_can_view_any_task_in_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->viewAny($this->member, $this->workspace1));
    }

    /** @test */
    public function external_user_cannot_view_tasks_in_other_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->viewAny($this->externalUser, $this->workspace1));
    }

    /** @test */
    public function owner_can_view_specific_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->view($this->owner, $task));
    }

    /** @test */
    public function member_can_view_specific_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->view($this->member, $task));
    }

    /** @test */
    public function external_user_cannot_view_task_in_other_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->view($this->externalUser, $task));
    }

    /** @test */
    public function owner_can_create_task()
    {
        $policy = new TaskPolicy();
        $this->assertTrue($policy->create($this->owner, $this->workspace1));
    }

    /** @test */
    public function member_can_create_task()
    {
        $policy = new TaskPolicy();
        $this->assertTrue($policy->create($this->member, $this->workspace1));
    }

    /** @test */
    public function external_user_cannot_create_task_in_other_workspace()
    {
        $policy = new TaskPolicy();
        $this->assertFalse($policy->create($this->externalUser, $this->workspace1));
    }

    /** @test */
    public function task_creator_can_update_own_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->update($this->member, $task));
    }

    /** @test */
    public function owner_can_update_any_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->update($this->owner, $task));
    }

    /** @test */
    public function member_can_update_task_assigned_to_them()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
            'assignee_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->update($this->member, $task));
    }

    /** @test */
    public function member_cannot_update_task_not_created_or_assigned_to_them()
    {
        $otherMember = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->workspace1->users()->attach($otherMember->id, ['role' => 'member']);

        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
            'assignee_id' => $otherMember->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->update($this->member, $task));
    }

    /** @test */
    public function external_user_cannot_update_task_in_other_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->externalUser->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->update($this->externalUser, $task));
    }

    /** @test */
    public function task_creator_can_delete_own_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->delete($this->member, $task));
    }

    /** @test */
    public function owner_can_delete_any_task()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->delete($this->owner, $task));
    }

    /** @test */
    public function member_cannot_delete_task_not_created_by_them()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->delete($this->member, $task));
    }

    /** @test */
    public function member_can_archive_task_assigned_to_them()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
            'assignee_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->archive($this->member, $task));
    }

    /** @test */
    public function member_cannot_archive_task_not_created_or_assigned_to_them()
    {
        $otherMember = User::factory()->create(['tenant_id' => $this->tenant1->id]);
        $this->workspace1->users()->attach($otherMember->id, ['role' => 'member']);

        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
            'assignee_id' => $otherMember->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->archive($this->member, $task));
    }

    /** @test */
    public function external_user_cannot_archive_task_in_other_workspace()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->archive($this->externalUser, $task));
    }

    /** @test */
    public function owner_can_restore_any_archived_task()
    {
        $task = Task::factory()->archived()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->restore($this->owner, $task));
    }

    /** @test */
    public function member_can_restore_own_archived_task()
    {
        $task = Task::factory()->archived()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->member->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertTrue($policy->restore($this->member, $task));
    }

    /** @test */
    public function member_cannot_restore_archived_task_not_created_by_them()
    {
        $task = Task::factory()->archived()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
            'creator_id' => $this->owner->id,
        ]);

        $policy = new TaskPolicy();
        $this->assertFalse($policy->restore($this->member, $task));
    }

    /** @test */
    public function tasks_are_scoped_to_correct_tenant()
    {
        // Create tasks for each workspace
        $task1 = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $task2 = Task::factory()->create([
            'workspace_id' => $this->workspace2->id,
            'board_id' => $this->board2->id,
            'tenant_id' => $this->tenant2->id,
        ]);

        // Member should only see tasks from their workspace
        $memberTasks = Task::forTenant($this->member->tenant)->get();
        $this->assertTrue($memberTasks->contains($task1));
        $this->assertFalse($memberTasks->contains($task2));

        // External user should only see tasks from their workspace
        $externalTasks = Task::forTenant($this->externalUser->tenant)->get();
        $this->assertFalse($externalTasks->contains($task1));
        $this->assertTrue($externalTasks->contains($task2));
    }

    /** @test */
    public function tasks_are_scoped_to_correct_workspace()
    {
        // Create multiple workspaces for the same tenant
        $workspace3 = Workspace::factory()->create(['tenant_id' => $this->tenant1->id]);
        $board3 = Board::factory()->create(['workspace_id' => $workspace3->id]);

        $task1 = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $task2 = Task::factory()->create([
            'workspace_id' => $workspace3->id,
            'board_id' => $board3->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        // Query tasks for workspace1
        $workspace1Tasks = Task::where('workspace_id', $this->workspace1->id)->get();
        $this->assertTrue($workspace1Tasks->contains($task1));
        $this->assertFalse($workspace1Tasks->contains($task2));
    }

    /** @test */
    public function unauthorized_user_cannot_access_task_via_direct_route()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        // Simulate a route model binding with wrong user
        $this->actingAs($this->externalUser);

        $response = $this->getJson("/api/tasks/{$task->id}");
        $response->assertStatus(403); // Forbidden
    }

    /** @test */
    public function authorized_user_can_access_task_via_direct_route()
    {
        $task = Task::factory()->create([
            'workspace_id' => $this->workspace1->id,
            'board_id' => $this->board1->id,
            'tenant_id' => $this->tenant1->id,
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/tasks/{$task->id}");
        $response->assertStatus(200); // OK
    }

    /** @test */
    public function user_cannot_create_task_in_board_from_different_workspace()
    {
        $this->actingAs($this->member);

        $taskData = [
            'title' => 'Test Task',
            'board_id' => $this->board2->id, // Board from different workspace
            'status' => 'todo',
            'priority' => 'medium',
        ];

        $response = $this->postJson("/api/boards/{$this->board2->id}/tasks", $taskData);
        $response->assertStatus(403); // Forbidden
    }

    /** @test */
    public function user_can_only_reorder_tasks_within_their_board()
    {
        $task1 = Task::factory()->create([
            'board_id' => $this->board1->id,
            'workspace_id' => $this->workspace1->id,
            'tenant_id' => $this->tenant1->id,
            'position' => 1000,
        ]);

        $task2 = Task::factory()->create([
            'board_id' => $this->board2->id,
            'workspace_id' => $this->workspace2->id,
            'tenant_id' => $this->tenant2->id,
            'position' => 2000,
        ]);

        $this->actingAs($this->member);

        // Try to reorder task from another workspace
        $response = $this->patchJson("/api/tasks/{$task2->id}/position", [
            'position' => 1500,
        ]);

        $response->assertStatus(403); // Forbidden
    }
}