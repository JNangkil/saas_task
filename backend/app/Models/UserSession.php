<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSession extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'token_id',
        'ip_address',
        'user_agent',
        'last_activity',
        'is_current',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_activity' => 'datetime',
            'is_current' => 'boolean',
        ];
    }

    /**
     * Get the user that owns the session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the access token that owns the session.
     */
    public function token(): BelongsTo
    {
        return $this->belongsTo(\Laravel\Sanctum\PersonalAccessToken::class, 'token_id');
    }

    /**
     * Scope a query to only include active sessions.
     */
    public function scopeActive($query)
    {
        return $query->where('last_activity', '>', now()->subMinutes(config('sanctum.expiration', 525600)));
    }

    /**
     * Scope a query to only include current session.
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }

    /**
     * Scope a query to exclude current session.
     */
    public function scopeOtherSessions($query)
    {
        return $query->where('is_current', false);
    }

    /**
     * Check if session is expired.
     */
    public function isExpired(): bool
    {
        return $this->last_activity->lt(now()->subMinutes(config('sanctum.expiration', 525600)));
    }

    /**
     * Get session device information.
     */
    public function getDeviceInfo(): array
    {
        $userAgent = $this->user_agent;
        
        // Simple device detection (you can use a more sophisticated library)
        $device = 'Unknown';
        $browser = 'Unknown';
        $platform = 'Unknown';

        if (strpos($userAgent, 'Mobile') !== false) {
            $device = 'Mobile';
        } elseif (strpos($userAgent, 'Tablet') !== false) {
            $device = 'Tablet';
        } else {
            $device = 'Desktop';
        }

        if (strpos($userAgent, 'Chrome') !== false) {
            $browser = 'Chrome';
        } elseif (strpos($userAgent, 'Firefox') !== false) {
            $browser = 'Firefox';
        } elseif (strpos($userAgent, 'Safari') !== false) {
            $browser = 'Safari';
        } elseif (strpos($userAgent, 'Edge') !== false) {
            $browser = 'Edge';
        }

        if (strpos($userAgent, 'Windows') !== false) {
            $platform = 'Windows';
        } elseif (strpos($userAgent, 'Mac') !== false) {
            $platform = 'macOS';
        } elseif (strpos($userAgent, 'Linux') !== false) {
            $platform = 'Linux';
        } elseif (strpos($userAgent, 'Android') !== false) {
            $platform = 'Android';
        } elseif (strpos($userAgent, 'iOS') !== false) {
            $platform = 'iOS';
        }

        return [
            'device' => $device,
            'browser' => $browser,
            'platform' => $platform,
        ];
    }

    /**
     * Get formatted last activity time.
     */
    public function getFormattedLastActivity(): string
    {
        return $this->last_activity->diffForHumans();
    }
}