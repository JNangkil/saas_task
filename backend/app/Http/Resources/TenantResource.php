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
            'settings' => $this->settings ?? [],
            'status' => $this->status,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        // Include user's role in the tenant
        if (auth()->check()) {
            $user = auth()->user();
            $data['user_role'] = $this->getUserRole($user);
            $data['permissions'] = [
                'can_manage' => $this->canUserManage($user),
                'can_update' => $user->can('update', $this->resource),
                'can_delete' => $user->can('delete', $this->resource),
                'can_manage_users' => $user->can('manageUsers', $this->resource),
                'can_manage_settings' => $user->can('manageSettings', $this->resource),
                'can_create_workspaces' => $user->can('createWorkspaces', $this->resource),
                'can_view_analytics' => $user->can('viewAnalytics', $this->resource),
                'can_manage_billing' => $user->can('manageBilling', $this->resource),
            ];
        }

        // Include subscription information if loaded
        if ($this->relationLoaded('subscription')) {
            $data['subscription'] = [
                'id' => $this->subscription->id ?? null,
                'status' => $this->subscription->status ?? 'inactive',
                'plan_name' => $this->subscription->plan->name ?? null,
                'trial_ends_at' => $this->subscription->trial_ends_at ?? null,
                'ends_at' => $this->subscription->ends_at ?? null,
                'is_on_trial' => $this->subscription->isTrialing() ?? false,
                'is_active' => $this->subscription->isActive() ?? false,
            ];
        }

        // Include active subscription if loaded
        if ($this->relationLoaded('activeSubscription')) {
            $data['active_subscription'] = [
                'id' => $this->activeSubscription->id ?? null,
                'status' => $this->activeSubscription->status ?? 'inactive',
                'plan_name' => $this->activeSubscription->plan->name ?? null,
                'trial_ends_at' => $this->activeSubscription->trial_ends_at ?? null,
                'ends_at' => $this->activeSubscription->ends_at ?? null,
                'is_on_trial' => $this->activeSubscription->isTrialing() ?? false,
                'is_active' => $this->activeSubscription->isActive() ?? false,
                'plan_limits' => $this->activeSubscription->getPlanLimits() ?? [],
            ];
        }

        // Include workspaces if loaded
        if ($this->relationLoaded('workspaces')) {
            $data['workspaces'] = WorkspaceResource::collection($this->whenLoaded('workspaces'));
            $data['workspace_count'] = $this->when(
                $this->relationLoaded('workspaces'),
                $this->workspaces->count()
            );
        }

        // Include workspace counts if loaded
        if ($this->relationLoaded('workspaces_count')) {
            $data['workspace_count'] = $this->workspaces_count;
        }

        // Include active workspace count
        $data['active_workspace_count'] = $this->when(
            $this->relationLoaded('activeWorkspaces'),
            $this->activeWorkspaces->count()
        );

        // Include users if loaded
        if ($this->relationLoaded('users')) {
            $data['users'] = $this->users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url ?? null,
                    'role' => $user->pivot->role,
                    'joined_at' => $user->pivot->joined_at,
                    'invited_at' => $user->pivot->invited_at,
                ];
            });
            $data['user_count'] = $this->users->count();
        }

        // Include member counts by role
        $data['member_counts'] = [
            'owners' => $this->getUsersByRole('owner')->count(),
            'admins' => $this->getUsersByRole('admin')->count(),
            'members' => $this->getUsersByRole('member')->count(),
            'total' => $this->users()->count(),
        ];

        // Include tenant owner information
        $owner = $this->owner();
        if ($owner) {
            $data['owner'] = [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'avatar_url' => $owner->avatar_url ?? null,
            ];
        }

        // Include computed properties
        $data['is_active'] = $this->isActive();
        $data['has_active_subscription'] = $this->hasActiveSubscription();
        $data['is_on_trial'] = $this->isOnTrial();
        $data['subscription_status'] = $this->getSubscriptionStatus();

        // Include default workspace if loaded
        if ($this->relationLoaded('defaultWorkspace')) {
            $data['default_workspace'] = $this->whenLoaded('defaultWorkspace');
        }

        return $data;
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function with($request): array
    {
        return [
            'meta' => [
                'version' => '1.0',
                'resource_type' => 'tenant',
            ],
        ];
    }
}