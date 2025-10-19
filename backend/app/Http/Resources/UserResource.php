<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
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
            'email' => $this->email,
            'displayName' => $this->name,
            'roles' => $this->roles ?? ['Member'],
            'onboardingCompleted' => (bool) $this->onboarding_completed,
            'locale' => $this->locale ?? 'en',
            'companyName' => $this->company_name,
        ];
    }
}
