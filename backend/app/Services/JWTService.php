<?php

namespace App\Services;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;
use Lcobucci\JWT\JWT;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;

class JWTService
{
    /**
     * Generate JWT token for user with tenant context.
     */
    public function generateToken(User $user, ?int $tenantId = null): string
    {
        $signer = new Sha256();
        $key = InMemory::plainText(config('app.jwt_secret', 'your-secret-key'));

        $now = now();
        $payload = [
            'iss' => config('app.url'),
            'iat' => $now->getTimestamp(),
            'exp' => $now->addMinutes(config('sanctum.expiration', 525600))->getTimestamp(),
            'sub' => $user->id,
            'email' => $user->email,
            'is_super_admin' => $user->isSuperAdmin(),
        ];

        // Add tenant_id to payload if provided or get from current context
        if ($tenantId) {
            $payload['tenant_id'] = $tenantId;
        } elseif (tenant()) {
            $payload['tenant_id'] = tenant()->id;
        } elseif (!$user->isSuperAdmin()) {
            // For non-super admin users, try to get their first tenant
            $userTenantId = $this->getUserTenantId($user);
            if ($userTenantId) {
                $payload['tenant_id'] = $userTenantId;
            }
        }

        // Add user roles for the current tenant if applicable
        if (isset($payload['tenant_id']) && !$user->isSuperAdmin()) {
            $tenant = Tenant::find($payload['tenant_id']);
            if ($tenant) {
                $payload['tenant_role'] = $tenant->getUserRole($user);
            }
        }

        return JWT::encode($payload, $signer, $key);
    }

    /**
     * Generate JWT token for user in a specific tenant context.
     */
    public function generateTokenForTenant(User $user, Tenant $tenant): string
    {
        return $this->generateToken($user, $tenant->id);
    }

    /**
     * Parse JWT token and return payload.
     */
    public function parseToken(string $token): ?array
    {
        $signer = new Sha256();
        $key = InMemory::plainText(config('app.jwt_secret', 'your-secret-key'));

        try {
            $decoded = JWT::decode($token, $signer, $key);
            return (array) $decoded->claims();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Validate JWT token and return payload.
     */
    public function validateToken(string $token): ?array
    {
        $payload = $this->parseToken($token);
        
        if (!$payload) {
            return null;
        }

        // Check if token is expired
        if (isset($payload['exp']) && $payload['exp'] < now()->getTimestamp()) {
            return null;
        }

        return $payload;
    }

    /**
     * Get current user's tenant ID for JWT token generation.
     */
    public function getUserTenantId(User $user): ?int
    {
        // First try to get from current tenant context
        if (tenant()) {
            return tenant()->id;
        }

        // Get the user's first tenant as fallback
        $tenant = $user->tenants()->first();
        return $tenant ? $tenant->id : null;
    }

    /**
     * Get all tenants for a user (for tenant switching).
     */
    public function getUserTenants(User $user): array
    {
        return $user->tenants()->get()->map(function ($tenant) use ($user) {
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'role' => $tenant->getUserRole($user),
                'is_current' => tenant() && tenant()->id === $tenant->id,
            ];
        })->toArray();
    }

    /**
     * Refresh JWT token with updated tenant context.
     */
    public function refreshToken(string $token): ?string
    {
        $payload = $this->validateToken($token);
        
        if (!$payload) {
            return null;
        }

        $user = User::find($payload['sub']);
        if (!$user) {
            return null;
        }

        // Generate new token with current tenant context
        return $this->generateToken($user, $payload['tenant_id'] ?? null);
    }
}