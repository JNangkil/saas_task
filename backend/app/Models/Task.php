<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Task extends Model
{
    use HasFactory, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'board_id',
        'workspace_id',
        'tenant_id',
        'title',
        'description',
        'status',
        'priority',
        'assignee_id',
        'creator_id',
        'due_date',
        'start_date',
        'completed_at',
        'archived_at',
        'position',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'datetime',
            'start_date' => 'datetime',
            'completed_at' => 'datetime',
            'archived_at' => 'datetime',
            'position' => 'decimal:4',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the board that owns the task.
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /**
     * Get the workspace that owns the task.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Get the tenant that owns the task.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user assigned to the task.
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    /**
     * Get the user who created the task.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    /**
     * Get the labels associated with the task.
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'task_labels');
    }

    /**
     * Get the custom values for the task.
     */
    public function customValues(): HasMany
    {
        return $this->hasMany(TaskCustomValue::class);
    }

    /**
     * Get the task custom values for the task.
     */
    public function taskCustomValues(): HasMany
    {
        return $this->hasMany(TaskCustomValue::class);
    }

    /**
     * Get comments for the task.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    /**
     * Get the task field values for the task.
     */
    public function taskFieldValues(): HasMany
    {
        return $this->hasMany(TaskFieldValue::class);
    }
    /**
     * Get field values for the task.
     */
    public function fieldValues(): HasMany
    {
        return $this->hasMany(TaskFieldValue::class);
    }

    /**
     * Scope a query to only include tasks with a specific status.
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to only include tasks with a specific priority.
     */
    public function scopeWithPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope a query to only include tasks assigned to a specific user.
     */
    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assignee_id', $userId);
    }

    /**
     * Scope a query to only include tasks in a specific board.
     */
    public function scopeInBoard($query, $boardId)
    {
        return $query->where('board_id', $boardId);
    }

    /**
     * Scope a query to only include active (not archived) tasks.
     */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    /**
     * Scope a query to only include archived tasks.
     */
    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    /**
     * Scope a query to only include completed tasks.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'done');
    }

    /**
     * Mark the task as completed.
     */
    public function markAsCompleted(): void
    {
        $this->status = 'done';
        $this->completed_at = now();
        $this->save();
    }

    /**
     * Archive the task.
     */
    public function archive(): void
    {
        $this->status = 'archived';
        $this->archived_at = now();
        $this->save();
    }
}