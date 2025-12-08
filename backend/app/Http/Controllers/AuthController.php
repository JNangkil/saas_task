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

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('sanctum.expiration', 525600) * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'tenant' => $tenantId ? [
                'id' => $tenantId,
            ] : null,
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
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}