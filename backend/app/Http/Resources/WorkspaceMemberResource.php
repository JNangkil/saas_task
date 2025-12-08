<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceMemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->pivot->role,
            'status' => $this->pivot->status ?? 'active',
            'joined_at' => $this->pivot->joined_at,
            'invited_by' => $this->pivot->invited_by ? [
                'id' => $this->pivot->invited_by,
            ] : null,
        ];
    }
}