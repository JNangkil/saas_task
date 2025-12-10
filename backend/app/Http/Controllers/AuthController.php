<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\MfaDisableRequest;
use App\Http\Requests\MfaEnableRequest;
use App\Http\Requests\MfaSetupRequest;
use App\Http\Requests\MfaVerifyRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\PasswordResetToken;
use App\Services\AccountLockoutService;
use App\Services\JWTService;
use App\Services\MFAService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private JWTService $jwtService,
        private MFAService $mfaService,
        private AccountLockoutService $accountLockoutService,
        private UserService $userService
    ) {}

    /**
     * Handle user login and return JWT token with tenant context.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        // Find the user first to check lockout status
        $user = \App\Models\User::where('email', $credentials['email'])->first();
        
        if ($user) {
            // Check if account is locked
            if ($this->accountLockoutService->isAccountLocked($user)) {
                $remainingTime = $this->accountLockoutService->getRemainingLockoutTime($user);
                return response()->json([
                    'error' => 'Account locked',
                    'message' => 'Your account has been temporarily locked due to multiple failed login attempts.',
                    'locked_until' => $user->accountLockout->locked_until,
                    'retry_after' => $remainingTime,
                ], 423);
            }
        }

        // Attempt authentication
        if (!Auth::attempt($credentials)) {
            // Record failed attempt if user exists
            if ($user) {
                $lockout = $this->accountLockoutService->recordFailedAttempt($user);
                
                // Check if account was just locked
                if ($lockout->isLocked()) {
                    $remainingTime = $this->accountLockoutService->getRemainingLockoutTime($user);
                    return response()->json([
                        'error' => 'Account locked',
                        'message' => 'Your account has been temporarily locked due to multiple failed login attempts.',
                        'locked_until' => $lockout->locked_until,
                        'retry_after' => $remainingTime,
                        'failed_attempts' => $lockout->failed_attempts,
                    ], 423);
                }
                
                return response()->json([
                    'error' => 'Invalid credentials',
                    'message' => 'The provided credentials are incorrect.',
                    'failed_attempts' => $lockout->failed_attempts,
                    'remaining_attempts' => max(0, 5 - $lockout->failed_attempts),
                ], 401);
            }
            
            return response()->json([
                'error' => 'Invalid credentials',
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $user = Auth::user();
        
        // Reset failed attempts on successful login
        $this->accountLockoutService->resetFailedAttempts($user);
        
        // Get tenant ID from user's current tenant context
        $tenantId = $this->jwtService->getUserTenantId($user);

        // Generate JWT token with tenant context
        $token = $this->jwtService->generateToken($user, $tenantId);

        // Get user's tenants for multi-tenant support
        $userTenants = $this->jwtService->getUserTenants($user);

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('sanctum.expiration', 525600) * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
            'tenant' => $tenantId ? [
                'id' => $tenantId,
            ] : null,
            'tenants' => $userTenants,
        ]);
    }

    /**
     * Handle user logout.
     */
    public function logout(Request $request): JsonResponse
    {
        // Invalidate the user's token
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    /**
     * Get the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get current tenant context
        $currentTenant = tenant();
        
        // Get user's tenants for multi-tenant support
        $userTenants = $this->jwtService->getUserTenants($user);
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
            'tenant' => $currentTenant ? [
                'id' => $currentTenant->id,
                'name' => $currentTenant->name,
                'slug' => $currentTenant->slug,
                'role' => $currentTenant->getUserRole($user),
            ] : null,
            'tenants' => $userTenants,
        ]);
    }

    /**
     * Switch to a different tenant context.
     */
    public function switchTenant(Request $request, int $tenantId): JsonResponse
    {
        $user = $request->user();
        
        // Verify user belongs to the requested tenant
        $tenant = $user->tenants()->where('tenants.id', $tenantId)->first();
        
        if (!$tenant) {
            return response()->json([
                'error' => 'Access denied',
                'message' => 'You do not have access to this tenant',
            ], 403);
        }

        // Generate new token with updated tenant context
        $token = $this->jwtService->generateTokenForTenant($user, $tenant);
        
        // Get updated user tenants list
        $userTenants = $this->jwtService->getUserTenants($user);

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('sanctum.expiration', 525600) * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'role' => $tenant->getUserRole($user),
            ],
            'tenants' => $userTenants,
        ]);
    }

    /**
     * Refresh the current JWT token.
     */
    public function refresh(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json([
                'error' => 'Token required',
                'message' => 'Bearer token is required',
            ], 401);
        }

        $newToken = $this->jwtService->refreshToken($token);
        
        if (!$newToken) {
            return response()->json([
                'error' => 'Invalid token',
                'message' => 'The provided token is invalid or expired',
            ], 401);
        }

        $user = $request->user();
        $currentTenant = tenant();
        $userTenants = $this->jwtService->getUserTenants($user);

        return response()->json([
            'token' => $newToken,
            'token_type' => 'bearer',
            'expires_in' => config('sanctum.expiration', 525600) * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
            ],
            'tenant' => $currentTenant ? [
                'id' => $currentTenant->id,
                'name' => $currentTenant->name,
                'slug' => $currentTenant->slug,
                'role' => $currentTenant->getUserRole($user),
            ] : null,
            'tenants' => $userTenants,
        ]);
    }

    /**
     * Handle password reset request.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = \App\Models\User::where('email', $validated['email'])->first();

        if ($user) {
            // Create password reset token
            $resetToken = PasswordResetToken::createForUser($user, 60);

            try {
                // Send password reset email
                Mail::to($user->email)->send(new \App\Mail\PasswordReset($resetToken));
            } catch (\Exception $e) {
                // Log the error but don't expose it to the user
                \Log::error('Failed to send password reset email: ' . $e->getMessage());
                
                // In development, you might want to return the error
                if (config('app.debug')) {
                    return response()->json([
                        'error' => 'Failed to send password reset email',
                        'message' => $e->getMessage(),
                        'token' => $resetToken->token, // Only for development
                    ], 500);
                }
                
                // In production, still return success to prevent email enumeration
                // but the user won't receive the email
                return response()->json([
                    'message' => 'If an account exists with this email, a password reset link has been sent.',
                ]);
            }

            return response()->json([
                'message' => 'Password reset link has been sent to your email.',
            ]);
        }

        // Always return success message to prevent email enumeration attacks
        return response()->json([
            'message' => 'If an account exists with this email, a password reset link has been sent.',
        ]);
    }

    /**
     * Handle password reset.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Find valid reset token
        $resetToken = PasswordResetToken::findValidToken($validated['token']);

        if (!$resetToken || $resetToken->user->email !== $validated['email']) {
            return response()->json([
                'error' => 'Invalid token',
                'message' => 'The reset token is invalid or has expired.',
            ], 400);
        }

        $user = $resetToken->user;

        // Update user password
        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Mark token as used
        $resetToken->markAsUsed();

        // Revoke all existing tokens for the user
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password has been successfully reset. Please log in with your new password.',
        ]);
    }

    /**
     * Verify if a reset token is valid.
     */
    public function verifyResetToken(Request $request): JsonResponse
    {
        $token = $request->get('token');

        if (!$token) {
            return response()->json([
                'valid' => false,
                'message' => 'Token is required.',
            ], 400);
        }

        $resetToken = PasswordResetToken::findValidToken($token);

        return response()->json([
            'valid' => !is_null($resetToken),
            'message' => $resetToken ? 'Token is valid.' : 'Token is invalid or has expired.',
        ]);
    }

    /**
     * Setup MFA for the authenticated user.
     */
    public function mfaSetup(MfaSetupRequest $request): JsonResponse
    {
        $user = $request->user();
        
        // Generate secret and QR code
        $secret = $this->mfaService->generateSecret($user);
        $qrCode = $this->mfaService->generateQrCode($user, $secret);
        $recoveryCodes = $this->mfaService->generateRecoveryCodes();

        // Setup MFA record (not enabled yet)
        $userMfa = $this->mfaService->setupMfa($user, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_code' => $qrCode,
            'recovery_codes' => $recoveryCodes,
            'message' => 'MFA setup initiated. Please verify the code to enable MFA.',
        ]);
    }

    /**
     * Enable MFA after verification.
     */
    public function mfaEnable(MfaEnableRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        // Verify the TOTP code
        if (!$this->mfaService->verifyCode($user, $validated['code'])) {
            return response()->json([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ], 422);
        }

        // Enable MFA
        $this->mfaService->enableMfa($user);

        return response()->json([
            'message' => 'MFA has been successfully enabled for your account.',
            'enabled' => true,
        ]);
    }

    /**
     * Disable MFA for the authenticated user.
     */
    public function mfaDisable(MfaDisableRequest $request): JsonResponse
    {
        $user = $request->user();

        // Disable MFA
        $this->mfaService->disableMfa($user);

        return response()->json([
            'message' => 'MFA has been successfully disabled for your account.',
            'disabled' => true,
        ]);
    }

    /**
     * Verify TOTP code during login.
     */
    public function mfaVerify(MfaVerifyRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        // Check if account is locked before MFA verification
        if ($this->accountLockoutService->isAccountLocked($user)) {
            $remainingTime = $this->accountLockoutService->getRemainingLockoutTime($user);
            return response()->json([
                'error' => 'Account locked',
                'message' => 'Your account has been temporarily locked due to multiple failed login attempts.',
                'locked_until' => $user->accountLockout->locked_until,
                'retry_after' => $remainingTime,
            ], 423);
        }

        // Verify the TOTP code
        if (!$this->mfaService->verifyCode($user, $validated['code'])) {
            // Record failed attempt for MFA
            $this->accountLockoutService->recordFailedAttempt($user);
            
            return response()->json([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ], 422);
        }

        return response()->json([
            'message' => 'MFA verification successful.',
            'verified' => true,
        ]);
    }

    /**
     * Get MFA status for the authenticated user.
     */
    public function mfaStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $userMfa = $user->mfa;

        return response()->json([
            'enabled' => $userMfa ? $userMfa->isEnabled() : false,
            'setup' => $userMfa !== null,
            'recovery_codes_count' => $userMfa ? $userMfa->getRemainingRecoveryCodesCount() : 0,
        ]);
    }

    /**
     * Change user password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $success = $this->userService->changePassword(
            $user,
            $validated['current_password'],
            $validated['password']
        );

        if (!$success) {
            return response()->json([
                'error' => 'Invalid current password',
                'message' => 'The current password you entered is incorrect.',
            ], 422);
        }

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Get active sessions for the authenticated user.
     */
    public function getActiveSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = $this->userService->getActiveSessions($user);

        return response()->json([
            'sessions' => $sessions,
            'count' => count($sessions),
        ]);
    }

    /**
     * Revoke a specific session.
     */
    public function revokeSession(Request $request, int $sessionId): JsonResponse
    {
        $user = $request->user();
        
        $success = $this->userService->revokeSession($user, $sessionId);

        if (!$success) {
            return response()->json([
                'error' => 'Session not found',
                'message' => 'The specified session could not be found or cannot be revoked.',
            ], 404);
        }

        return response()->json([
            'message' => 'Session revoked successfully.',
        ]);
    }

    /**
     * Revoke all other sessions except the current one.
     */
    public function revokeAllOtherSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $revokedCount = $this->userService->revokeAllOtherSessions($user);

        return response()->json([
            'message' => 'All other sessions revoked successfully.',
            'revoked_count' => $revokedCount,
        ]);
    }

    /**
     * Get security log for the authenticated user.
     */
    public function getSecurityLog(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min($request->get('limit', 50), 100); // Max 100 entries
        $offset = $request->get('offset', 0);

        $logs = $this->userService->getSecurityLog($user, $limit, $offset);

        return response()->json([
            'logs' => $logs,
            'count' => count($logs),
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    /**
     * Get backup codes for the authenticated user.
     */
    public function getBackupCodes(Request $request): JsonResponse
    {
        $user = $request->user();
        $codes = $this->userService->getBackupCodes($user);

        return response()->json($codes);
    }

    /**
     * Regenerate backup codes for the authenticated user.
     */
    public function regenerateBackupCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $codes = $this->userService->regenerateBackupCodes($user);

            return response()->json([
                'message' => 'Backup codes regenerated successfully.',
                'codes' => $codes['codes'],
                'codes_count' => $codes['codes_count'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Cannot regenerate backup codes',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}