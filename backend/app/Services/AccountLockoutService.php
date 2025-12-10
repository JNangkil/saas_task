<?php

namespace App\Services;

use App\Models\AccountLockout;
use App\Models\User;
use App\Mail\AccountLockoutNotification;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class AccountLockoutService
{
    /**
     * Maximum number of failed attempts before lockout.
     */
    const MAX_FAILED_ATTEMPTS = 5;

    /**
     * Default lockout duration in minutes.
     */
    const DEFAULT_LOCKOUT_DURATION = 15;

    /**
     * Check if a user's account is currently locked.
     */
    public function isAccountLocked(User $user): bool
    {
        $lockout = $this->getLockoutForUser($user);
        
        return $lockout && $lockout->isLocked();
    }

    /**
     * Get the remaining lockout time in seconds for a user.
     */
    public function getRemainingLockoutTime(User $user): int
    {
        $lockout = $this->getLockoutForUser($user);
        
        if (!$lockout || !$lockout->isLocked()) {
            return 0;
        }

        return $lockout->getRemainingLockoutTimeInSeconds();
    }

    /**
     * Record a failed login attempt for a user.
     */
    public function recordFailedAttempt(User $user): AccountLockout
    {
        $lockout = AccountLockout::getOrCreateForUser($user);
        $lockout->incrementFailedAttempts();

        // Check if account should be locked
        if ($lockout->shouldLockAccount(self::MAX_FAILED_ATTEMPTS)) {
            $this->lockAccount($user);
        }

        return $lockout;
    }

    /**
     * Lock a user's account.
     */
    public function lockAccount(User $user, ?int $durationInMinutes = null): AccountLockout
    {
        $lockout = AccountLockout::getOrCreateForUser($user);
        
        if ($durationInMinutes === null) {
            $durationInMinutes = $lockout->getLockoutDuration();
        }

        $lockout->lockAccount($durationInMinutes);

        // Send lockout notification
        $this->sendLockoutNotification($user, $lockout);

        return $lockout;
    }

    /**
     * Unlock a user's account.
     */
    public function unlockAccount(User $user): AccountLockout
    {
        $lockout = AccountLockout::getOrCreateForUser($user);
        $lockout->resetFailedAttempts();

        return $lockout;
    }

    /**
     * Reset failed attempts on successful login.
     */
    public function resetFailedAttempts(User $user): AccountLockout
    {
        $lockout = AccountLockout::getOrCreateForUser($user);
        $lockout->resetFailedAttempts();

        return $lockout;
    }

    /**
     * Get lockout information for a user.
     */
    public function getLockoutStatus(User $user): array
    {
        $lockout = $this->getLockoutForUser($user);
        
        if (!$lockout) {
            return [
                'is_locked' => false,
                'failed_attempts' => 0,
                'remaining_time' => 0,
                'locked_until' => null,
                'last_failed_at' => null,
            ];
        }

        return [
            'is_locked' => $lockout->isLocked(),
            'failed_attempts' => $lockout->failed_attempts,
            'remaining_time' => $lockout->getRemainingLockoutTimeInSeconds(),
            'locked_until' => $lockout->locked_until,
            'last_failed_at' => $lockout->last_failed_at,
        ];
    }

    /**
     * Get the lockout record for a user.
     */
    private function getLockoutForUser(User $user): ?AccountLockout
    {
        return $user->accountLockout;
    }

    /**
     * Send lockout notification to the user.
     */
    private function sendLockoutNotification(User $user, AccountLockout $lockout): void
    {
        try {
            Mail::to($user->email)->send(new AccountLockoutNotification($user, $lockout));
        } catch (\Exception $e) {
            // Log the error but don't prevent the lockout
            \Log::error('Failed to send account lockout notification', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if an IP address has too many failed attempts (optional rate limiting).
     */
    public function isIpRateLimited(string $ipAddress): bool
    {
        // This could be implemented with cache or database tracking
        // For now, we'll return false as this is beyond the basic requirements
        return false;
    }

    /**
     * Get lockout statistics for admin purposes.
     */
    public function getLockoutStatistics(): array
    {
        $totalLockouts = AccountLockout::count();
        $activeLockouts = AccountLockout::locked()->count();
        $usersWithFailedAttempts = AccountLockout::withFailedAttempts()->count();

        return [
            'total_lockouts' => $totalLockouts,
            'active_lockouts' => $activeLockouts,
            'users_with_failed_attempts' => $usersWithFailedAttempts,
        ];
    }

    /**
     * Clean up expired lockout records (for maintenance).
     */
    public function cleanupExpiredLockouts(): int
    {
        // Find lockouts that have been expired for more than 30 days
        $cutoffDate = now()->subDays(30);
        
        return AccountLockout::where('locked_until', '<', $cutoffDate)
            ->where('failed_attempts', 0)
            ->delete();
    }
}