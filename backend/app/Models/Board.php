<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model
{
    use HasFactory, BelongsToTenant;

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
        'is_archived',
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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the tenant that owns the board.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the workspace that owns the board.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Get the tasks for the board.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get the active (non-archived) tasks for the board.
     */
    public function activeTasks(): HasMany
    {
        return $this->tasks()->where('is_archived', false);
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