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
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];

        // Include user's role in the workspace
        if (auth()->check()) {
            $data['user_role'] = $this->getUserRole(auth()->user());
        }

        // Include tenant if loaded
        if ($this->relationLoaded('tenant')) {
            $data['tenant'] = [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'slug' => $this->tenant->slug,
            ];
        }

        // Include users if loaded
        if ($this->relationLoaded('users')) {
            $data['users'] = $this->users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                    'joined_at' => $user->pivot->joined_at,
                ];
            });
        }

        // Include boards if loaded
        if ($this->relationLoaded('boards')) {
            $data['boards'] = $this->boards->map(function ($board) {
                return [
                    'id' => $board->id,
                    'name' => $board->name,
                    'description' => $board->description,
                ];
            });
        }

        // Include member count if loaded
        if ($this->relationLoaded('users_count')) {
            $data['member_count'] = $this->users_count;
        }

        return $data;
    }
}