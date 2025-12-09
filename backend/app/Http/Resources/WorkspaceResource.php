<?php

namespace App\Http\Resources;

use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'icon' => $this->icon,
            'is_archived' => $this->is_archived,
            'is_default' => $this->is_default,
            'settings' => $this->settings ?? [],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];

        // Include user's role in the workspace and permissions
        if (auth()->check()) {
            $user = auth()->user();
            $data['user_role'] = $this->getUserRole($user);
            $data['permissions'] = [
                'can_manage' => $this->canUserManage($user),
                'can_update' => $user->can('update', $this->resource),
                'can_delete' => $user->can('delete', $this->resource),
                'can_archive' => $user->can('archive', $this->resource),
                'can_restore' => $user->can('restore', $this->resource),
                'can_manage_members' => $user->can('manageMembers', $this->resource),
                'can_add_members' => $user->can('addMembers', $this->resource),
                'can_remove_members' => $user->can('removeMembers', $this->resource),
                'can_update_member_roles' => $user->can('updateMemberRoles', $this->resource),
                'can_create_boards' => $user->can('createBoards', $this->resource),
                'can_view_boards' => $user->can('viewBoards', $this->resource),
                'can_manage_settings' => $user->can('manageSettings', $this->resource),
                'can_view_analytics' => $user->can('viewAnalytics', $this->resource),
                'can_change_default' => $user->can('changeDefault', $this->resource),
                'can_invite_users' => $user->can('inviteUsers', $this->resource),
                'can_manage_tasks' => $user->can('manageTasks', $this->resource),
                'can_view_tasks' => $user->can('viewTasks', $this->resource),
                'can_export_data' => $user->can('exportData', $this->resource),
                'can_duplicate' => $user->can('duplicate', $this->resource),
            ];
        }

        // Include tenant if loaded
        if ($this->relationLoaded('tenant')) {
            $data['tenant'] = [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'slug' => $this->tenant->slug,
                'logo_url' => $this->tenant->logo_url,
            ];
        }

        // Include users if loaded
        if ($this->relationLoaded('users')) {
            $data['users'] = $this->users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url ?? null,
                    'role' => $user->pivot->role,
                    'joined_at' => $user->pivot->joined_at,
                ];
            });
            $data['member_count'] = $this->users->count();
        }

        // Include member counts by role
        $data['member_counts'] = [
            'admins' => $this->getUsersByRole('admin')->count(),
            'members' => $this->getUsersByRole('member')->count(),
            'viewers' => $this->getUsersByRole('viewer')->count(),
            'total' => $this->users()->count(),
        ];

        // Include member count if loaded
        if ($this->relationLoaded('users_count')) {
            $data['member_count'] = $this->users_count;
        }

        // Include boards if loaded
        if ($this->relationLoaded('boards')) {
            $data['boards'] = $this->boards->map(function ($board) {
                return [
                    'id' => $board->id,
                    'name' => $board->name,
                    'description' => $board->description,
                    'is_archived' => $board->is_archived,
                    'created_at' => $board->created_at,
                ];
            });
            $data['board_count'] = $this->boards->count();
        }

        // Include board counts
        $data['board_counts'] = [
            'total' => $this->boards()->count(),
            'active' => $this->activeBoards()->count(),
            'archived' => $this->boards()->onlyTrashed()->count(),
        ];

        // Include active boards if loaded
        if ($this->relationLoaded('activeBoards')) {
            $data['active_boards'] = $this->whenLoaded('activeBoards');
            $data['active_board_count'] = $this->activeBoards->count();
        }

        // Include computed properties
        $data['is_active'] = $this->isActive();
        $data['is_archived'] = $this->isArchived();
        $data['is_default'] = $this->isDefault();

        // Include statistics if requested
        if ($request->has('include_stats')) {
            $data['statistics'] = [
                'tasks_count' => $this->tasks()->count(),
                'completed_tasks_count' => $this->tasks()->where('status', 'completed')->count(),
                'pending_tasks_count' => $this->tasks()->where('status', 'pending')->count(),
                'overdue_tasks_count' => $this->tasks()
                    ->where('due_date', '<', now())
                    ->where('status', '!=', 'completed')
                    ->count(),
            ];
        }

        // Include recent activity if requested
        if ($request->has('include_activity')) {
            $data['recent_activity'] = $this->getRecentActivity();
        }

        return $data;
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function with($request): array
    {
        return [
            'meta' => [
                'version' => '1.0',
                'resource_type' => 'workspace',
            ],
        ];
    }

    /**
     * Get recent activity for the workspace.
     *
     * @return array
     */
    private function getRecentActivity(): array
    {
        // This would typically query activity logs or similar
        // For now, return empty array as placeholder
        return [
            'recent_tasks' => [],
            'recent_board_changes' => [],
            'recent_member_changes' => [],
        ];
    }
}