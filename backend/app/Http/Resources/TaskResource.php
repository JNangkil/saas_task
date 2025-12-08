<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
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
            'board_id' => $this->board_id,
            'workspace_id' => $this->workspace_id,
            'tenant_id' => $this->tenant_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'position' => (float) $this->position,
            'due_date' => $this->due_date?->toISOString(),
            'start_date' => $this->start_date?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];

        // Include assignee if loaded
        if ($this->relationLoaded('assignee')) {
            $data['assignee'] = $this->assignee ? [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'email' => $this->assignee->email,
            ] : null;
        }

        // Include creator if loaded
        if ($this->relationLoaded('creator')) {
            $data['creator'] = $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null;
        }

        // Include board if loaded
        if ($this->relationLoaded('board')) {
            $data['board'] = [
                'id' => $this->board->id,
                'name' => $this->board->name,
                'description' => $this->board->description,
                'color' => $this->board->color,
                'icon' => $this->board->icon,
            ];
        }

        // Include workspace if loaded
        if ($this->relationLoaded('workspace')) {
            $data['workspace'] = [
                'id' => $this->workspace->id,
                'name' => $this->workspace->name,
                'description' => $this->workspace->description,
                'color' => $this->workspace->color,
                'icon' => $this->workspace->icon,
            ];
        }

        // Include labels if loaded
        if ($this->relationLoaded('labels')) {
            $data['labels'] = $this->labels->map(function ($label) {
                return [
                    'id' => $label->id,
                    'name' => $label->name,
                    'color' => $label->color,
                ];
            });
        }

        // Include custom values if loaded
        if ($this->relationLoaded('customValues')) {
            $data['custom_values'] = $this->customValues->map(function ($customValue) {
                return [
                    'id' => $customValue->id,
                    'field_name' => $customValue->field_name,
                    'field_type' => $customValue->field_type,
                    'value' => $customValue->value,
                    'typed_value' => $customValue->typed_value,
                ];
            });
        }

        // Include comments if loaded
        if ($this->relationLoaded('comments')) {
            $data['comments'] = $this->comments->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'user_id' => $comment->user_id,
                    'created_at' => $comment->created_at->toISOString(),
                    'updated_at' => $comment->updated_at->toISOString(),
                ];
            });
        }

        // Include comment count if loaded
        if ($this->relationLoaded('comments_count')) {
            $data['comments_count'] = $this->comments_count;
        }

        // Add computed properties
        $data['is_completed'] = $this->status === 'done';
        $data['is_archived'] = !is_null($this->archived_at);
        $data['is_overdue'] = $this->due_date && $this->due_date->isPast() && !$this->is_completed;
        $data['days_until_due'] = $this->due_date ? now()->diffInDays($this->due_date, false) : null;

        // Add user permissions
        if (auth()->check()) {
            $user = auth()->user();
            $data['permissions'] = [
                'can_update' => $this->canUserUpdate($user),
                'can_delete' => $this->canUserDelete($user),
                'can_archive' => $this->canUserArchive($user),
                'can_restore' => $this->canUserRestore($user),
                'can_duplicate' => $this->canUserDuplicate($user),
            ];
        }

        return $data;
    }

    /**
     * Check if user can update the task
     */
    private function canUserUpdate($user): bool
    {
        return $this->creator_id === $user->id || 
               $this->assignee_id === $user->id ||
               $this->workspace->canUserManage($user);
    }

    /**
     * Check if user can delete the task
     */
    private function canUserDelete($user): bool
    {
        return $this->creator_id === $user->id ||
               $this->workspace->canUserManage($user);
    }

    /**
     * Check if user can archive the task
     */
    private function canUserArchive($user): bool
    {
        return $this->creator_id === $user->id || 
               $this->assignee_id === $user->id ||
               $this->workspace->canUserManage($user);
    }

    /**
     * Check if user can restore the task
     */
    private function canUserRestore($user): bool
    {
        return $this->creator_id === $user->id || 
               $this->assignee_id === $user->id ||
               $this->workspace->canUserManage($user);
    }

    /**
     * Check if user can duplicate the task
     */
    private function canUserDuplicate($user): bool
    {
        return $this->creator_id === $user->id || 
               $this->assignee_id === $user->id ||
               $this->workspace->canUserManage($user);
    }
}