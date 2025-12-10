<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class AccountLockout extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'failed_attempts',
        'locked_until',
        'last_failed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'failed_attempts' => 'integer',
            'locked_until' => 'datetime',
            'last_failed_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the lockout.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the account is currently locked.
     */
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Get the remaining lockout time in minutes.
     */
    public function getRemainingLockoutTime(): int
    {
        if (!$this->isLocked()) {
            return 0;
        }

        return $this->locked_until->diffInMinutes(now());
    }

    /**
     * Get the remaining lockout time in seconds.
     */
    public function getRemainingLockoutTimeInSeconds(): int
    {
        if (!$this->isLocked()) {
            return 0;
        }

        return $this->locked_until->diffInSeconds(now());
    }

    /**
     * Increment the failed attempts counter.
     */
    public function incrementFailedAttempts(): self
    {
        $this->failed_attempts += 1;
        $this->last_failed_at = now();
        $this->save();

        return $this;
    }

    /**
     * Lock the account for the specified duration.
     */
    public function lockAccount(int $durationInMinutes = 15): self
    {
        $this->locked_until = now()->addMinutes($durationInMinutes);
        $this->save();

        return $this;
    }

    /**
     * Reset the failed attempts counter.
     */
    public function resetFailedAttempts(): self
    {
        $this->failed_attempts = 0;
        $this->locked_until = null;
        $this->last_failed_at = null;
        $this->save();

        return $this;
    }

    /**
     * Check if the account should be locked based on failed attempts.
     */
    public function shouldLockAccount(int $maxAttempts = 5): bool
    {
        return $this->failed_attempts >= $maxAttempts;
    }

    /**
     * Get the lockout duration in minutes.
     */
    public function getLockoutDuration(): int
    {
        if (!$this->locked_until) {
            return 0;
        }

        // Calculate based on failed attempts for progressive lockout
        $baseDuration = 15; // 15 minutes base
        $increment = 5; // 5 minutes additional per attempt beyond threshold
        
        if ($this->failed_attempts <= 5) {
            return $baseDuration;
        }

        return $baseDuration + (($this->failed_attempts - 5) * $increment);
    }

    /**
     * Scope a query to only include locked accounts.
     */
    public function scopeLocked($query)
    {
        return $query->where('locked_until', '>', now());
    }

    /**
     * Scope a query to only include unlocked accounts.
     */
    public function scopeUnlocked($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('locked_until')
              ->orWhere('locked_until', '<=', now());
        });
    }

    /**
     * Scope a query to only include accounts with failed attempts.
     */
    public function scopeWithFailedAttempts($query)
    {
        return $query->where('failed_attempts', '>', 0);
    }

    /**
     * Get or create a lockout record for the user.
     */
    public static function getOrCreateForUser(User $user): self
    {
        $lockout = static::firstOrNew(['user_id' => $user->id]);
        
        if (!$lockout->exists) {
            $lockout->failed_attempts = 0;
            $lockout->save();
        }

        return $lockout;
    }
}