<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Board extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'workspace_id',
        'name',
        'description',
        'color',
        'icon',
        'type',
        'position',
        'is_archived',
        'created_by',
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
            'position' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the workspace that owns the board.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Get the tenant that owns the board.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the creator of the board.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the tasks for the board.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get the columns for the board.
     */
    public function columns(): HasMany
    {
        return $this->hasMany(BoardColumn::class)->orderBy('position');
    }

    /**
     * Get the user board preferences for the board.
     */
    public function userBoardPreferences(): HasMany
    {
        return $this->hasMany(UserBoardPreference::class);
    }

    /**
     * Get the users who have favorited this board.
     */
    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_board_favorites')
            ->using(UserBoardFavorite::class)
            ->withTimestamps();
    }

    /**
     * Get the active (not archived) tasks for the board.
     */
    public function activeTasks(): HasMany
    {
        return $this->tasks()->whereNull('archived_at');
    }

    /**
     * Check if the board is archived.
     */
    public function isArchived(): bool
    {
        return $this->is_archived;
    }

    /**
     * Check if the board is active (not archived).
     */
    public function isActive(): bool
    {
        return !$this->is_archived;
    }

    /**
     * Archive the board.
     */
    public function archive(): void
    {
        $this->is_archived = true;
        $this->save();
    }

    /**
     * Restore the board from archive.
     */
    public function restore(): void
    {
        $this->is_archived = false;
        $this->save();
    }

    /**
     * Scope a query to only include active boards.
     */
    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    /**
     * Scope a query to only include archived boards.
     */
    public function scopeArchived($query)
    {
        return $query->where('is_archived', true);
    }

    /**
     * Scope a query to only include boards in a specific workspace.
     */
    public function scopeInWorkspace($query, $workspaceId)
    {
        return $query->where('workspace_id', $workspaceId);
    }
}