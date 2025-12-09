<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use App\Models\UserBoardViewPreference;
use App\Models\Workspace;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class BoardViewPreferenceTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $tenant;
    protected $workspace;
    protected $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create();
        
        $this->workspace = Workspace::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        
        $this->board = Board::factory()->create([
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->actingAs($this->user, 'sanctum');
    }

    /**
     * Test it can get view preferences.
     */
    public function test_it_can_get_view_preferences(): void
    {
        // Create initial preferences
        UserBoardViewPreference::create([
            'user_id' => $this->user->id,
            'board_id' => $this->board->id,
            'preferred_view' => 'kanban',
            'kanban_config' => ['group_by' => 'priority']
        ]);

        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/boards/{$this->board->id}/view-preferences");

        $response->assertStatus(200)
            ->assertJson([
                'preferred_view' => 'kanban',
                'kanban_config' => ['group_by' => 'priority']
            ]);
    }

    /**
     * Test it returns default preferences if none exist.
     */
    public function test_it_returns_default_preferences_if_none_exist(): void
    {
        $response = $this->getJson("/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/boards/{$this->board->id}/view-preferences");

        $response->assertStatus(200)
            ->assertJson([
                'preferred_view' => 'table', // Default is table in controller
                'kanban_config' => [],
                'calendar_config' => [],
                'filters' => []
            ]);
    }

    /**
     * Test it can update view preferences.
     */
    public function test_it_can_update_view_preferences(): void
    {
        $payload = [
            'preferred_view' => 'calendar',
            'calendar_config' => ['mode' => 'month'],
            'kanban_config' => ['group_by' => 'assignee']
        ];

        $response = $this->putJson(
            "/api/tenants/{$this->tenant->id}/workspaces/{$this->workspace->id}/boards/{$this->board->id}/view-preferences",
            $payload
        );

        $response->assertStatus(200)
            ->assertJson([
                'preferred_view' => 'calendar',
                'calendar_config' => ['mode' => 'month'],
                'kanban_config' => ['group_by' => 'assignee']
            ]);
            
        // Verify DB
        $this->assertDatabaseHas('user_board_view_preferences', [
            'user_id' => $this->user->id,
            'board_id' => $this->board->id,
            'preferred_view' => 'calendar',
        ]);
        
        // Verify JSON fields logic manually if assertDatabaseHas doesn't support JSON deep check easily with strings
        $pref = UserBoardViewPreference::where('user_id', $this->user->id)
            ->where('board_id', $this->board->id)
            ->first();
            
        $this->assertEquals(['mode' => 'month'], $pref->calendar_config);
        $this->assertEquals(['group_by' => 'assignee'], $pref->kanban_config);
    }
}
