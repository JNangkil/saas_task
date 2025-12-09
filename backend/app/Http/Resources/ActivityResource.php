<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
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
            'user' => $this->when($this->user, function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'avatar_url' => $this->user->avatar_url,
                ];
            }),
            'action' => $this->action,
            'description' => $this->description,
            'changes' => $this->changes,
            'metadata' => $this->metadata,
            'icon' => $this->icon,
            'color' => $this->color,
            'subject_type' => class_basename($this->subject_type),
            'subject_id' => $this->subject_id,
            'created_at' => $this->created_at,
            'created_at_human' => $this->created_at->diffForHumans(),
        ];
    }
}