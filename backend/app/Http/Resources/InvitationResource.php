<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvitationResource extends JsonResource
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
            'workspace_id' => $this->workspace_id,
            'tenant_id' => $this->tenant_id,
            'email' => $this->email,
            'role' => $this->role,
            'message' => $this->message,
            'status' => $this->status,
            'expires_at' => $this->expires_at,
            'accepted_at' => $this->accepted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

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

        // Include tenant if loaded
        if ($this->relationLoaded('tenant')) {
            $data['tenant'] = [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'slug' => $this->tenant->slug,
            ];
        }

        // Include invited by user if loaded
        if ($this->relationLoaded('invitedBy')) {
            $data['invited_by'] = [
                'id' => $this->invitedBy->id,
                'name' => $this->invitedBy->name,
                'email' => $this->invitedBy->email,
            ];
        }

        // Include user who accepted if loaded
        if ($this->relationLoaded('user')) {
            $data['user'] = $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null;
        }

        return $data;
    }
}