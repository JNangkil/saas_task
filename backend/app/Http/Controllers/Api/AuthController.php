<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    /**
     * Register a new user account.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var array<string> $roles */
        $roles = ['Owner'];

        /** @var \App\Models\User $user */
        $user = DB::transaction(function () use ($validated, $roles): User {
            $user = User::create([
                'name' => $validated['name'],
                'company_name' => $validated['company_name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'roles' => $roles,
                'onboarding_completed' => false,
                'locale' => $validated['locale'] ?? 'en',
            ]);

            $workspace = Workspace::create([
                'name' => $validated['company_name'],
                'default_locale' => $validated['locale'] ?? 'en',
                'owner_id' => $user->id,
            ]);

            $workspace->members()->attach($user->id, ['role' => 'Owner']);

            return $user;
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * Authenticate a user with email/password credentials.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid credentials provided.',
            ], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        Auth::guard('web')->logout();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
