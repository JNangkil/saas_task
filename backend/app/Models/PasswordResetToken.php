<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PasswordResetToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public $timestamps = false;

    /**
     * Get the user that owns the password reset token.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the token is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the token has been used.
     */
    public function isUsed(): bool
    {
        return !is_null($this->used_at);
    }

    /**
     * Check if the token is valid.
     */
    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isUsed();
    }

    /**
     * Mark the token as used.
     */
    public function markAsUsed(): void
    {
        $this->used_at = now();
        $this->save();
    }

    /**
     * Create a new password reset token for the user.
     */
    public static function createForUser(User $user, int $expirationMinutes = 60): self
    {
        // Invalidate any existing tokens for this user
        static::where('user_id', $user->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        return static::create([
            'user_id' => $user->id,
            'token' => static::generateToken(),
            'expires_at' => now()->addMinutes($expirationMinutes),
            'created_at' => now(),
        ]);
    }

    /**
     * Generate a secure random token.
     */
    protected static function generateToken(): string
    {
        return hash('sha256', random_bytes(32));
    }

    /**
     * Find a valid token by its value.
     */
    public static function findValidToken(string $token): ?self
    {
        return static::where('token', $token)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();
    }
}
