<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Workspace
 */
class WorkspaceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'logoUrl' => $this->logo_url,
            'defaultLocale' => $this->default_locale,
            'createdAt' => $this->created_at?->toISOString(),
            'membershipRole' => $this->whenPivotLoaded('workspace_user', fn () => $this->pivot->role),
        ];
    }
}

