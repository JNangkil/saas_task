<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantUserResource extends JsonResource
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
            'job_title' => $this->job_title,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status,
            'role' => $this->pivot->role ?? null,
            'invited_at' => $this->pivot->invited_at ?? null,
            'joined_at' => $this->pivot->joined_at ?? null,
            'created_at' => $this->created_at,
        ];
    }
}
