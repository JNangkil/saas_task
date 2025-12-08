<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the tenants that the user belongs to.
     */
    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_user')
            ->withPivot('role', 'invited_at', 'joined_at')
            ->withTimestamps();
    }

    /**
     * Get the workspaces that the user belongs to.
     */
    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_user')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    /**
     * Get the user board preferences for the user.
     */
    public function userBoardPreferences(): HasMany
    {
        return $this->hasMany(UserBoardPreference::class);
    }

    /**
     * Get the user's role in a specific tenant.
     */
    public function getTenantRole(Tenant $tenant): ?string
    {
        $pivot = $this->tenants()->where('tenants.id', $tenant->id)->first()?->pivot;
        return $pivot?->role;
    }

    /**
     * Get the user's role in a specific workspace.
     */
    public function getWorkspaceRole(Workspace $workspace): ?string
    {
        $pivot = $this->workspaces()->where('workspaces.id', $workspace->id)->first()?->pivot;
        return $pivot?->role;
    }

    /**
     * Check if user has a specific role in a tenant.
     */
    public function hasTenantRole(Tenant $tenant, string $role): bool
    {
        return $this->getTenantRole($tenant) === $role;
    }

    /**
     * Check if user has a specific role in a workspace.
     */
    public function hasWorkspaceRole(Workspace $workspace, string $role): bool
    {
        return $this->getWorkspaceRole($workspace) === $role;
    }

    /**
     * Check if user can manage a tenant.
     */
    public function canManageTenant(Tenant $tenant): bool
    {
        $role = $this->getTenantRole($tenant);
        return in_array($role, ['owner', 'admin']);
    }

    /**
     * Check if user can manage a workspace.
     */
    public function canManageWorkspace(Workspace $workspace): bool
    {
        $role = $this->getWorkspaceRole($workspace);
        return in_array($role, ['admin']);
    }

    /**
     * Check if user can create boards in a workspace.
     */
    public function canCreateBoardsInWorkspace(Workspace $workspace): bool
    {
        $role = $this->getWorkspaceRole($workspace);
        return in_array($role, ['admin', 'member']);
    }

    /**
     * Get the user's current tenant (for multi-tenant context).
     */
    public function currentTenant()
    {
        // This will be implemented with tenant resolution middleware
        return tenant();
    }

    /**
     * Get the user's current workspace (for workspace context).
     */
    public function currentWorkspace()
    {
        // This will be implemented with workspace context service
        return current_workspace();
    }
}
