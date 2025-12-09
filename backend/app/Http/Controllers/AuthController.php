<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Services\JWTService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct(
        private JWTService $jwtService
    ) {}

    /**
     * Handle user login and return JWT token with tenant context.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'error' => 'Invalid credentials',
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $user = Auth::user();
        
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
}