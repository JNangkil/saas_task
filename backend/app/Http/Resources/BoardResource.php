<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BoardResource extends JsonResource
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
            'workspace_id' => $this->workspace_id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'icon' => $this->icon,
            'type' => $this->type,
            'position' => $this->position,
            'is_archived' => $this->is_archived,
            'is_favorite' => $this->whenLoaded('favoritedBy', function () {
                return $this->favoritedBy->contains(auth()->id());
            }, false), // Default strictly might require explicit loading or check count
            // Alternatively, use a loaded attribute if appended. For now, rely on eager loading 'favoritedBy' with constraint or check relationship.
            // A common pattern is: 'is_favorite' => $this->favoritedBy()->where('user_id', auth()->id())->exists(), 
            // but that causes N+1 if not careful. The controller should load logic.
            // Let's assume the controller adds a boolean attribute 'is_favorite' or we use 'favoritedBy' collection check if loaded.
            'created_by' => new UserResource($this->whenLoaded('creator')),
            'columns' => BoardColumnResource::collection($this->whenLoaded('columns')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
