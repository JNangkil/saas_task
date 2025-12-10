<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityLog extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'event_type',
        'description',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the security log.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include logs of a given type.
     */
    public function scopeEventType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope a query to only include recent logs.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get formatted event type for display.
     */
    public function getFormattedEventType(): string
    {
        return match($this->event_type) {
            'login' => 'Login',
            'logout' => 'Logout',
            'password_changed' => 'Password Changed',
            'mfa_enabled' => 'MFA Enabled',
            'mfa_disabled' => 'MFA Disabled',
            'mfa_setup' => 'MFA Setup',
            'backup_codes_regenerated' => 'Backup Codes Regenerated',
            'session_revoked' => 'Session Revoked',
            'all_sessions_revoked' => 'All Sessions Revoked',
            'failed_login' => 'Failed Login',
            'account_locked' => 'Account Locked',
            'account_unlocked' => 'Account Unlocked',
            'password_reset_requested' => 'Password Reset Requested',
            'password_reset_completed' => 'Password Reset Completed',
            default => ucfirst(str_replace('_', ' ', $this->event_type)),
        };
    }

    /**
     * Get event icon class.
     */
    public function getIconClass(): string
    {
        return match($this->event_type) {
            'login' => 'bi-box-arrow-in-right',
            'logout' => 'bi-box-arrow-right',
            'password_changed', 'password_reset_completed' => 'bi-key-fill',
            'mfa_enabled', 'mfa_setup' => 'bi-shield-check',
            'mfa_disabled' => 'bi-shield-x',
            'backup_codes_regenerated' => 'bi-arrow-repeat',
            'session_revoked', 'all_sessions_revoked' => 'bi-x-circle',
            'failed_login', 'account_locked' => 'bi-exclamation-triangle-fill text-danger',
            'account_unlocked' => 'bi-unlock-fill',
            'password_reset_requested' => 'bi-envelope-fill',
            default => 'bi-info-circle',
        };
    }

    /**
     * Get event color class.
     */
    public function getColorClass(): string
    {
        return match($this->event_type) {
            'login' => 'text-success',
            'logout' => 'text-secondary',
            'password_changed', 'password_reset_completed' => 'text-primary',
            'mfa_enabled', 'mfa_setup' => 'text-success',
            'mfa_disabled' => 'text-warning',
            'backup_codes_regenerated' => 'text-info',
            'session_revoked', 'all_sessions_revoked' => 'text-warning',
            'failed_login', 'account_locked' => 'text-danger',
            'account_unlocked' => 'text-success',
            'password_reset_requested' => 'text-info',
            default => 'text-secondary',
        };
    }

    /**
     * Create a security log entry.
     */
    public static function createLog(
        User $user,
        string $eventType,
        string $description,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        array $metadata = []
    ): self {
        return static::create([
            'user_id' => $user->id,
            'event_type' => $eventType,
            'description' => $description,
            'ip_address' => $ipAddress ?? request()->ip(),
            'user_agent' => $userAgent ?? request()->userAgent(),
            'metadata' => $metadata,
        ]);
    }
}