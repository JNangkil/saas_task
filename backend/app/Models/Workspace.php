<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'color',
        'icon',
        'is_archived',
        'is_default',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_archived' => 'boolean',
            'is_default' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the tenant that owns the workspace.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the users that belong to the workspace.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_user')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    /**
     * Get the boards for the workspace.
     */
    public function boards(): HasMany
    {
        return $this->hasMany(Board::class);
    }

    /**
     * Get the active (non-archived) boards for the workspace.
     */
    public function activeBoards(): HasMany
    {
        return $this->boards()->where('is_archived', false);
    }

    /**
     * Get the user's role in the workspace.
     */
    public function getUserRole(User $user): ?string
    {
        $pivot = $this->users()->where('users.id', $user->id)->first()?->pivot;
        return $pivot?->role;
    }

    /**
     * Check if a user has a specific role in the workspace.
     */
    public function hasUserRole(User $user, string $role): bool
    {
        return $this->getUserRole($user) === $role;
    }

    /**
     * Check if a user can manage the workspace.
     */
    public function canUserManage(User $user): bool
    {
        $role = $this->getUserRole($user);
        return in_array($role, ['owner', 'admin']);
    }

    /**
     * Check if a user can create boards in the workspace.
     */
    public function canUserCreateBoards(User $user): bool
    {
        $role = $this->getUserRole($user);
        return in_array($role, ['owner', 'admin', 'member']);
    }

    /**
     * Check if a user can view the workspace.
     */
    public function canUserView(User $user): bool
    {
        $role = $this->getUserRole($user);
        return in_array($role, ['owner', 'admin', 'member', 'viewer']);
    }

    /**
     * Check if the workspace is archived.
     */
    public function isArchived(): bool
    {
        return $this->is_archived;
    }

    /**
     * Check if the workspace is active (not archived).
     */
    public function isActive(): bool
    {
        return !$this->is_archived;
    }

    /**
     * Check if the workspace is the default workspace for its tenant.
     */
    public function isDefault(): bool
    {
        return $this->is_default;
    }

    /**
     * Get the admin of the workspace.
     */
    public function admins()
    {
        return $this->users()->wherePivot('role', 'admin')->get();
    }

    /**
     * Get the members of the workspace (excluding admins).
     */
    public function members()
    {
        return $this->users()->wherePivot('role', 'member')->get();
    }

    /**
     * Get the viewers of the workspace.
     */
    public function viewers()
    {
        return $this->users()->wherePivot('role', 'viewer')->get();
    }

    /**
     * Get the member count for the workspace.
     */
    public function getMemberCountAttribute(): int
    {
        return $this->users()->count();
    }

    /**
     * Archive the workspace.
     */
    public function archive(): void
    {
        $this->is_archived = true;
        $this->save();
    }

    /**
     * Restore the workspace from archive.
     */
    public function restore(): void
    {
        $this->is_archived = false;
        $this->save();
    }

    /**
     * Scope a query to only include active workspaces.
     */
    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    /**
     * Scope a query to only include archived workspaces.
     */
    public function scopeArchived($query)
    {
        return $query->where('is_archived', true);
    }

    /**
     * Scope a query to only include default workspaces.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
}