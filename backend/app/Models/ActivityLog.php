<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tenant_id',
        'workspace_id',
        'subject_type',
        'subject_id',
        'action',
        'description',
        'changes',
        'metadata',
    ];

    protected $casts = [
        'changes' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the tenant this activity belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the workspace this activity belongs to.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Get the subject of the activity.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to get activities for a specific tenant.
     */
    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to get activities for a specific workspace.
     */
    public function scopeForWorkspace($query, $workspaceId)
    {
        return $query->where('workspace_id', $workspaceId);
    }

    /**
     * Scope to get activities by a specific user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get activities of a specific action type.
     */
    public function scopeOfAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get activities within a date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope to get activities for a specific subject.
     */
    public function scopeForSubject($query, $subject)
    {
        return $query->where('subject_type', get_class($subject))
                    ->where('subject_id', $subject->id);
    }

    /**
     * Get the icon class for the action type.
     */
    public function getIconAttribute(): string
    {
        return match($this->action) {
            'created' => 'bi-plus-circle',
            'updated' => 'bi-pencil',
            'deleted' => 'bi-trash',
            'assigned' => 'bi-person-plus',
            'unassigned' => 'bi-person-dash',
            'commented' => 'bi-chat-dots',
            'attached' => 'bi-paperclip',
            'detached' => 'bi-x-circle',
            'moved' => 'bi-arrows-move',
            'copied' => 'bi-files',
            'reordered' => 'bi-list',
            'archived' => 'bi-archive',
            'restored' => 'bi-arrow-counterclockwise',
            default => 'bi-circle',
        };
    }

    /**
     * Get the color class for the action type.
     */
    public function getColorAttribute(): string
    {
        return match($this->action) {
            'created' => 'success',
            'updated' => 'primary',
            'deleted' => 'danger',
            'assigned' => 'info',
            'unassigned' => 'warning',
            'commented' => 'secondary',
            'attached' => 'info',
            'detached' => 'warning',
            'moved' => 'primary',
            'copied' => 'success',
            'reordered' => 'secondary',
            'archived' => 'warning',
            'restored' => 'success',
            default => 'secondary',
        };
    }
}