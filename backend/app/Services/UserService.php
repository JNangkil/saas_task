<?php

namespace App\Services;

use App\Models\SecurityLog;
use App\Models\User;
use App\Models\UserMFA;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserService
{
    /**
     * Change user password.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): bool
    {
        // Verify current password
        if (!Hash::check($currentPassword, $user->password)) {
            return false;
        }

        // Update password
        $user->update([
            'password' => Hash::make($newPassword),
        ]);

        // Log the password change
        SecurityLog::createLog(
            $user,
            'password_changed',
            'Password was changed successfully',
            request()->ip(),
            request()->userAgent()
        );

        return true;
    }

    /**
     * Get active sessions for the user.
     */
    public function getActiveSessions(User $user): array
    {
        $currentToken = $user->currentAccessToken();
        
        if (!$currentToken) {
            return [];
        }

        // Get or create current session record
        $this->createOrUpdateCurrentSession($user, $currentToken);

        // Get all active sessions
        $sessions = $user->sessions()
            ->with('token')
            ->active()
            ->orderBy('last_activity', 'desc')
            ->get();

        return $sessions->map(function ($session) use ($currentToken) {
            $deviceInfo = $session->getDeviceInfo();
            
            return [
                'id' => $session->id,
                'token_id' => $session->token_id,
                'ip_address' => $session->ip_address,
                'device' => $deviceInfo['device'],
                'browser' => $deviceInfo['browser'],
                'platform' => $deviceInfo['platform'],
                'last_activity' => $session->last_activity->toISOString(),
                'formatted_last_activity' => $session->getFormattedLastActivity(),
                'is_current' => $session->token_id === $currentToken->id,
                'created_at' => $session->created_at->toISOString(),
            ];
        })->toArray();
    }

    /**
     * Revoke a specific session.
     */
    public function revokeSession(User $user, int $sessionId): bool
    {
        $session = $user->sessions()->find($sessionId);
        
        if (!$session) {
            return false;
        }

        // Don't allow revoking current session through this method
        $currentToken = $user->currentAccessToken();
        if ($currentToken && $session->token_id === $currentToken->id) {
            return false;
        }

        // Delete the token
        if ($session->token) {
            $session->token->delete();
        }

        // Delete the session record
        $session->delete();

        // Log the session revocation
        SecurityLog::createLog(
            $user,
            'session_revoked',
            "Session from {$session->ip_address} was revoked",
            request()->ip(),
            request()->userAgent(),
            ['revoked_session_ip' => $session->ip_address]
        );

        return true;
    }

    /**
     * Revoke all other sessions except the current one.
     */
    public function revokeAllOtherSessions(User $user): int
    {
        $currentToken = $user->currentAccessToken();
        
        if (!$currentToken) {
            return 0;
        }

        // Get all other sessions
        $otherSessions = $user->sessions()
            ->where('token_id', '!=', $currentToken->id)
            ->with('token')
            ->get();

        $revokedCount = 0;

        foreach ($otherSessions as $session) {
            // Delete the token
            if ($session->token) {
                $session->token->delete();
            }

            // Delete the session record
            $session->delete();
            $revokedCount++;
        }

        // Log the bulk session revocation
        SecurityLog::createLog(
            $user,
            'all_sessions_revoked',
            "All other sessions were revoked ({$revokedCount} sessions)",
            request()->ip(),
            request()->userAgent(),
            ['revoked_count' => $revokedCount]
        );

        return $revokedCount;
    }

    /**
     * Get security log for the user.
     */
    public function getSecurityLog(User $user, int $limit = 50, int $offset = 0): array
    {
        $logs = $user->securityLogs()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get();

        return $logs->map(function ($log) {
            return [
                'id' => $log->id,
                'event_type' => $log->event_type,
                'formatted_event_type' => $log->getFormattedEventType(),
                'description' => $log->description,
                'ip_address' => $log->ip_address,
                'icon_class' => $log->getIconClass(),
                'color_class' => $log->getColorClass(),
                'metadata' => $log->metadata,
                'created_at' => $log->created_at->toISOString(),
                'formatted_created_at' => $log->created_at->diffForHumans(),
            ];
        })->toArray();
    }

    /**
     * Get backup codes for the user.
     */
    public function getBackupCodes(User $user): array
    {
        $userMfa = $user->mfa;
        
        if (!$userMfa || !$userMfa->isEnabled()) {
            return [];
        }

        return [
            'codes_count' => $userMfa->getRemainingRecoveryCodesCount(),
            'codes' => [], // Never return actual codes, just count
        ];
    }

    /**
     * Regenerate backup codes for the user.
     */
    public function regenerateBackupCodes(User $user): array
    {
        $userMfa = $user->mfa;
        
        if (!$userMfa) {
            throw new \Exception('MFA is not set up for this user');
        }

        if (!$userMfa->isEnabled()) {
            throw new \Exception('MFA is not enabled for this user');
        }

        // Generate new recovery codes
        $newCodes = UserMFA::generateRecoveryCodes();
        $userMfa->recovery_codes = $newCodes;
        $userMfa->save();

        // Log the backup codes regeneration
        SecurityLog::createLog(
            $user,
            'backup_codes_regenerated',
            'Backup codes were regenerated',
            request()->ip(),
            request()->userAgent()
        );

        return [
            'codes' => $newCodes,
            'codes_count' => count($newCodes),
        ];
    }

    /**
     * Create or update current session record.
     */
    private function createOrUpdateCurrentSession(User $user, $currentToken): void
    {
        $sessionId = $currentToken->id;
        $ipAddress = request()->ip();
        $userAgent = request()->userAgent();

        // Mark all other sessions as not current
        $user->sessions()->where('token_id', '!=', $sessionId)->update(['is_current' => false]);

        // Create or update current session
        $session = $user->sessions()->where('token_id', $sessionId)->first();

        if ($session) {
            $session->update([
                'last_activity' => now(),
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'is_current' => true,
            ]);
        } else {
            $user->sessions()->create([
                'token_id' => $sessionId,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'last_activity' => now(),
                'is_current' => true,
            ]);
        }
    }
}