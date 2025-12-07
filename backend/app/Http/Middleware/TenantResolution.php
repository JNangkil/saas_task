<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class TenantResolution
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = null;

        // Priority 1: Resolve from subdomain
        if ($request->hasHost() && $host = $request->getHost()) {
            $subdomain = explode('.', $host)[0] ?? null;
            if ($subdomain && $subdomain !== 'www' && $subdomain !== 'app') {
                $tenant = Tenant::where('slug', $subdomain)->first();
            }
        }

        // Priority 2: Resolve from X-Tenant-ID header
        if (!$tenant && $request->hasHeader('X-Tenant-ID')) {
            $tenantId = $request->header('X-Tenant-ID');
            $tenant = Tenant::find($tenantId);
        }

        // Priority 3: Resolve from JWT claim
        if (!$tenant && Auth::check() && $token = $request->bearerToken()) {
            try {
                $payload = auth()->payload();
                if ($payload->has('tenant_id')) {
                    $tenant = Tenant::find($payload->get('tenant_id'));
                }
            } catch (\Exception $e) {
                // Invalid token, continue without tenant
            }
        }

        // Validate tenant if found
        if ($tenant) {
            // Check if tenant is active
            if (!$tenant->isActive()) {
                return response()->json([
                    'error' => 'Tenant is not active',
                    'message' => 'The tenant has been suspended or deactivated',
                ], 403);
            }

            // Check if authenticated user belongs to tenant
            if (Auth::check() && !$tenant->users()->where('users.id', Auth::id())->exists()) {
                return response()->json([
                    'error' => 'Access denied',
                    'message' => 'You do not have access to this tenant',
                ], 403);
            }

            // Set tenant context
            app()->instance('current_tenant', $tenant);
            $request->merge(['tenant_id' => $tenant->id]);
        }

        return $next($request);
    }
}