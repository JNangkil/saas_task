<?php

namespace App\Http\Resources;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_url' => $this->logo_url,
            'billing_email' => $this->billing_email,
            'settings' => $this->settings,
            'status' => $this->status,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        // Include user's role in the tenant
        if (auth()->check()) {
            $data['user_role'] = $this->getUserRole(auth()->user());
        }

        // Include workspaces if loaded
        if ($this->relationLoaded('workspaces')) {
            $data['workspaces'] = WorkspaceResource::collection($this->whenLoaded('workspaces'));
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
                    'invited_at' => $user->pivot->invited_at,
                ];
            });
        }

        return $data;
    }
}