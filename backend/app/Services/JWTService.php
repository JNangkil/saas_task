<?php

namespace App\Services;

use App\Models\User;
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
        ];

        // Add tenant_id to payload if provided
        if ($tenantId) {
            $payload['tenant_id'] = $tenantId;
        }

        return JWT::encode($payload, $signer, $key);
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
     * Get current user's tenant ID for JWT token generation.
     */
    public function getUserTenantId(User $user): ?int
    {
        // Get the user's current tenant from context or first tenant
        $tenant = $user->tenants()->first();
        return $tenant ? $tenant->id : null;
    }
}