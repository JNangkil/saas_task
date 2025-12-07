<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

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
        $role = $this->getUserRole($user);
        return in_array($role, ['owner', 'admin']);
    }
}