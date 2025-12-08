<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Invitation extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'invitations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'tenant_id',
        'email',
        'role',
        'token',
        'message',
        'invited_by',
        'expires_at',
        'status',
        'accepted_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'status' => 'string',
            'role' => 'string',
        ];
    }

    /**
     * Get the workspace that owns the invitation.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Get the tenant that owns the invitation.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who sent the invitation.
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Get the user who accepted the invitation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->nullable();
    }

    /**
     * Check if the invitation is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the invitation has been accepted.
     */
    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    /**
     * Check if the invitation has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the invitation can be accepted.
     */
    public function canBeAccepted(): bool
    {
        return $this->isPending() && !$this->isExpired();
    }

    /**
     * Generate a random token for invitations.
     */
    public static function generateToken(): string
    {
        return Str::random(48);
    }

    /**
     * Scope a query to only include pending invitations.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include accepted invitations.
     */
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    /**
     * Scope a query to only include expired invitations.
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now());
    }
}