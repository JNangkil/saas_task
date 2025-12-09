<?php

namespace App\Models;

use App\Traits\HasTenantRoles;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Builder;

class Tenant extends Model
{
    use HasFactory, HasTenantRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'billing_email',
        'stripe_customer_id',
        'settings',
        'status',
        'locale',
        'timezone',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the workspaces for the tenant.
     */
    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class);
    }

    /**
     * Get the boards for the tenant.
     */
    public function boards(): HasMany
    {
        return $this->hasMany(Board::class);
    }

    /**
     * Get the users that belong to the tenant.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tenant_user')
            ->withPivot('role', 'invited_at', 'joined_at')
            ->withTimestamps();
    }

    /**
     * Get the active workspaces for the tenant.
     */
    public function activeWorkspaces(): HasMany
    {
        return $this->workspaces()->where('is_archived', false);
    }

    /**
     * Get the default workspace for the tenant.
     */
    public function defaultWorkspace()
    {
        return $this->workspaces()->where('is_default', true)->first();
    }

    /**
     * Check if the tenant is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Get the owner of the tenant.
     */
    public function owner()
    {
        return $this->users()->wherePivot('role', 'owner')->first();
    }

    /**
     * Get the admins of the tenant.
     */
    public function admins()
    {
        return $this->users()->wherePivot('role', 'admin')->get();
    }

    /**
     * Get the members of the tenant (excluding owners and admins).
     */
    public function members()
    {
        return $this->users()->wherePivot('role', 'member')->get();
    }

    /**
     * Get the user's role in the tenant.
     */
    public function getUserRole(User $user): ?string
    {
        $pivot = $this->users()->where('users.id', $user->id)->first()?->pivot;
        return $pivot?->role;
    }

    /**
     * Check if a user has a specific role in the tenant.
     */
    public function hasUserRole(User $user, string $role): bool
    {
        return $this->getUserRole($user) === $role;
    }

    /**
     * Check if a user can manage the tenant.
     */
    public function canUserManage(User $user): bool
    {
        return $this->hasTenantPermission($user, $this, 'manage-settings');
    }

    /**
     * Check if a user can perform a specific action in the tenant
     */
    public function canUserPerformAction(User $user, string $action): bool
    {
        return $this->hasTenantPermission($user, $this, $action);
    }

    /**
     * Check if a user can manage another user's role in the tenant
     */
    public function canUserManageUserRole(User $user, User $targetUser): bool
    {
        return $this->canManageTenantUserRole($user, $targetUser, $this);
    }

    /**
     * Get users by role in the tenant
     */
    public function getUsersByRole(string $role)
    {
        return $this->users()->wherePivot('role', $role)->get();
    }

    /**
     * Check if user has any of the specified roles
     */
    public function hasAnyRole(User $user, array $roles): bool
    {
        $userRole = $this->getUserRole($user);
        return in_array($userRole, $roles);
    }

    /**
     * Check if user has a role at or above the specified level
     */
    public function hasRoleAtLeast(User $user, string $role): bool
    {
        $userRole = $this->getUserRole($user);
        if (!$userRole) {
            return false;
        }

        $userLevel = $this->getTenantRoleLevel($userRole);
        $requiredLevel = $this->getTenantRoleLevel($role);

        return $userLevel >= $requiredLevel;
    }

    /**
     * Get the current active subscription for the tenant.
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latest();
    }

    /**
     * Get all subscriptions for the tenant.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get the active subscription for the tenant.
     */
    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->where(function (Builder $query) {
                $query->where('status', Subscription::STATUS_ACTIVE)
                    ->orWhere('status', Subscription::STATUS_TRIALING);
            })
            ->where(function (Builder $query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->latest();
    }

    /**
     * Check if the tenant has an active subscription.
     */
    public function hasActiveSubscription(): bool
    {
        return $this->activeSubscription()->exists();
    }

    /**
     * Get the plan limits from the active subscription.
     */
    public function getPlanLimits(): array
    {
        $subscription = $this->activeSubscription;
        return $subscription ? $subscription->getPlanLimits() : [];
    }

    /**
     * Check if the tenant's plan includes a specific feature.
     */
    public function canUseFeature(string $feature): bool
    {
        $subscription = $this->activeSubscription;
        return $subscription ? $subscription->hasFeature($feature) : false;
    }

    /**
     * Check if the tenant is currently on a trial.
     */
    public function isOnTrial(): bool
    {
        $subscription = $this->activeSubscription;
        return $subscription ? $subscription->isTrialing() : false;
    }

    /**
     * Get the subscription status or 'inactive' if no subscription.
     */
    public function getSubscriptionStatus(): string
    {
        $subscription = $this->activeSubscription;
        return $subscription ? $subscription->status : 'inactive';
    }

    /**
     * Scope a query to eager load the subscription relationship.
     */
    public function scopeWithSubscription($query)
    {
        return $query->with(['subscription', 'activeSubscription']);
    }
}