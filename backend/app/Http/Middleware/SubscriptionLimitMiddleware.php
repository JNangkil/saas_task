<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Models\Subscription;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * SubscriptionLimitMiddleware
 * 
 * This middleware enforces subscription limits for tenants based on their active subscription plan.
 * It checks various limits such as user count, workspace count, storage, and feature access.
 * 
 * @package App\Http\Middleware
 */
class SubscriptionLimitMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if subscription limits are enabled in config
        if (!Config::get('billing.limits.enabled', true)) {
            return $next($request);
        }

        // Get the current tenant from the request
        $tenant = $this->getCurrentTenant($request);
        
        // If no tenant found, allow the request (handled by other middleware)
        if (!$tenant) {
            return $next($request);
        }

        // Check if the request should bypass limit checks
        if ($this->shouldBypassChecks($request, $tenant)) {
            return $next($request);
        }

        // Get the tenant's active subscription
        $subscription = $tenant->activeSubscription;
        
        // If no active subscription, check if within grace period
        if (!$subscription) {
            return $this->handleNoSubscription($tenant, $request);
        }

        // Check if subscription is valid (active or trialing)
        if (!$subscription->isValid()) {
            // Check if within grace period
            if ($subscription->isWithinGracePeriod()) {
                Log::info('Subscription is within grace period', [
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                    'ends_at' => $subscription->ends_at,
                ]);
                return $next($request);
            }
            
            return $this->handleInvalidSubscription($tenant, $subscription);
        }

        // Perform limit checks based on the request
        $limitCheckResult = $this->performLimitChecks($request, $tenant, $subscription);
        
        if ($limitCheckResult !== null) {
            return $limitCheckResult;
        }

        return $next($request);
    }

    /**
     * Get the current tenant from the request.
     *
     * @param Request $request
     * @return Tenant|null
     */
    private function getCurrentTenant(Request $request): ?Tenant
    {
        // Try to get tenant from the app instance (set by TenantResolution middleware)
        $tenant = app('current_tenant');
        
        if ($tenant) {
            return $tenant;
        }

        // Fallback: try to get tenant from request
        if ($request->has('tenant_id')) {
            return Tenant::find($request->input('tenant_id'));
        }

        return null;
    }

    /**
     * Determine if the request should bypass limit checks.
     *
     * @param Request $request
     * @param Tenant $tenant
     * @return bool
     */
    private function shouldBypassChecks(Request $request, Tenant $tenant): bool
    {
        $bypassConfig = Config::get('billing.limits.bypass', []);
        
        // Bypass for read-only operations if enabled
        if ($bypassConfig['read_only_operations'] ?? false) {
            if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'])) {
                return true;
            }
        }

        // Bypass for super admins if enabled
        if ($bypassConfig['super_admins'] ?? false) {
            $user = Auth::user();
            if ($user && $user->isSuperAdmin ?? false) {
                return true;
            }
        }

        // Bypass for specific routes
        $routeName = $request->route()?->getName();
        if ($routeName) {
            foreach ($bypassConfig['routes'] ?? [] as $pattern) {
                if ($this->matchesPattern($routeName, $pattern)) {
                    return true;
                }
            }
        }

        // Bypass for specific paths
        $path = $request->path();
        foreach ($bypassConfig['paths'] ?? [] as $pattern) {
            if ($this->matchesPattern($path, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a string matches a pattern with wildcards.
     *
     * @param string $string
     * @param string $pattern
     * @return bool
     */
    private function matchesPattern(string $string, string $pattern): bool
    {
        $regex = '/^' . str_replace('*', '.*', preg_quote($pattern, '/')) . '$/';
        return preg_match($regex, $string) === 1;
    }

    /**
     * Handle requests when tenant has no subscription.
     *
     * @param Tenant $tenant
     * @param Request $request
     * @return Response
     */
    private function handleNoSubscription(Tenant $tenant, Request $request): Response
    {
        Log::warning('Tenant attempted to access resource without subscription', [
            'tenant_id' => $tenant->id,
            'path' => $request->path(),
            'method' => $request->method(),
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'error' => 'Subscription Required',
            'message' => 'This feature requires an active subscription. Please choose a plan to continue.',
            'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
        ], 402);
    }

    /**
     * Handle requests with invalid subscription.
     *
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @return Response
     */
    private function handleInvalidSubscription(Tenant $tenant, Subscription $subscription): Response
    {
        Log::warning('Tenant attempted to access resource with invalid subscription', [
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'subscription_status' => $subscription->status,
        ]);

        $message = match($subscription->status) {
            Subscription::STATUS_PAST_DUE => 'Your subscription is past due. Please update your payment method.',
            Subscription::STATUS_CANCELED => 'Your subscription has been canceled.',
            Subscription::STATUS_EXPIRED => 'Your subscription has expired.',
            default => 'Your subscription is not active.',
        };

        return response()->json([
            'error' => 'Subscription Invalid',
            'message' => $message,
            'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
        ], 402);
    }

    /**
     * Perform limit checks based on the request.
     *
     * @param Request $request
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @return Response|null
     */
    private function performLimitChecks(Request $request, Tenant $tenant, Subscription $subscription): ?Response
    {
        // Check user limit if creating a new user
        if ($this->isUserCreationRequest($request)) {
            $result = $this->checkUserLimit($tenant, $subscription);
            if ($result) {
                return $result;
            }
        }

        // Check workspace limit if creating a new workspace
        if ($this->isWorkspaceCreationRequest($request)) {
            $result = $this->checkWorkspaceLimit($tenant, $subscription);
            if ($result) {
                return $result;
            }
        }

        // Check storage limit if uploading files
        if ($this->isFileUploadRequest($request)) {
            $result = $this->checkStorageLimit($tenant, $subscription, $request);
            if ($result) {
                return $result;
            }
        }

        // Check feature access based on route
        $feature = $this->getRequiredFeature($request);
        if ($feature) {
            $result = $this->checkFeatureAccess($tenant, $subscription, $feature);
            if ($result) {
                return $result;
            }
        }

        return null;
    }

    /**
     * Check if the request is for user creation.
     *
     * @param Request $request
     * @return bool
     */
    private function isUserCreationRequest(Request $request): bool
    {
        $path = $request->path();
        $method = $request->method();
        
        // Check for user creation endpoints
        return ($method === 'POST' && str_contains($path, '/users')) ||
               ($method === 'POST' && str_contains($path, '/invitations')) ||
               ($request->has('action') && $request->input('action') === 'add_user');
    }

    /**
     * Check if the request is for workspace creation.
     *
     * @param Request $request
     * @return bool
     */
    private function isWorkspaceCreationRequest(Request $request): bool
    {
        $path = $request->path();
        $method = $request->method();
        
        // Check for workspace creation endpoints
        return ($method === 'POST' && str_contains($path, '/workspaces')) ||
               ($request->has('action') && $request->input('action') === 'create_workspace');
    }

    /**
     * Check if the request is for file upload.
     *
     * @param Request $request
     * @return bool
     */
    private function isFileUploadRequest(Request $request): bool
    {
        return $request->hasFile('file') || 
               str_contains($request->path(), '/upload') ||
               $request->has('action') && $request->input('action') === 'upload_file';
    }

    /**
     * Get the required feature for the current route.
     *
     * @param Request $request
     * @return string|null
     */
    private function getRequiredFeature(Request $request): ?string
    {
        $path = $request->path();
        $featureMappings = Config::get('billing.limits.feature_mappings', []);
        
        foreach ($featureMappings as $feature => $patterns) {
            foreach ($patterns as $pattern) {
                if ($this->matchesPattern($path, $pattern)) {
                    return $feature;
                }
            }
        }
        
        return null;
    }

    /**
     * Check if tenant has exceeded user limit.
     *
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @return Response|null
     */
    private function checkUserLimit(Tenant $tenant, Subscription $subscription): ?Response
    {
        $maxUsers = $subscription->getPlanLimit('max_users');
        
        // If unlimited (0), no need to check
        if ($maxUsers === 0 || $maxUsers === null) {
            return null;
        }
        
        $currentUsers = $tenant->users()->count();
        
        if ($currentUsers >= $maxUsers) {
            Log::info('Tenant has exceeded user limit', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'current_users' => $currentUsers,
                'max_users' => $maxUsers,
            ]);
            
            return response()->json([
                'error' => 'User Limit Exceeded',
                'message' => "You have reached your plan's limit of {$maxUsers} users. Upgrade your plan to add more users.",
                'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
            ], 402);
        }
        
        return null;
    }

    /**
     * Check if tenant has exceeded workspace limit.
     *
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @return Response|null
     */
    private function checkWorkspaceLimit(Tenant $tenant, Subscription $subscription): ?Response
    {
        $maxWorkspaces = $subscription->getPlanLimit('max_workspaces');
        
        // If unlimited (0), no need to check
        if ($maxWorkspaces === 0 || $maxWorkspaces === null) {
            return null;
        }
        
        $currentWorkspaces = $tenant->workspaces()->count();
        
        if ($currentWorkspaces >= $maxWorkspaces) {
            Log::info('Tenant has exceeded workspace limit', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'current_workspaces' => $currentWorkspaces,
                'max_workspaces' => $maxWorkspaces,
            ]);
            
            return response()->json([
                'error' => 'Workspace Limit Exceeded',
                'message' => "You have reached your plan's limit of {$maxWorkspaces} workspaces. Upgrade your plan to create more workspaces.",
                'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
            ], 402);
        }
        
        return null;
    }

    /**
     * Check if tenant has exceeded storage limit.
     *
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @param Request $request
     * @return Response|null
     */
    private function checkStorageLimit(Tenant $tenant, Subscription $subscription, Request $request): ?Response
    {
        $maxStorageMb = $subscription->getPlanLimit('max_storage_mb');
        
        // If unlimited (0), no need to check
        if ($maxStorageMb === 0 || $maxStorageMb === null) {
            return null;
        }
        
        // Get current storage usage
        $currentStorageMb = $this->getCurrentStorageUsage($tenant);
        
        // Get upload size if available
        $uploadSizeMb = 0;
        if ($request->hasFile('file')) {
            $uploadSizeMb = $request->file('file')->getSize() / (1024 * 1024);
        }
        
        $totalAfterUpload = $currentStorageMb + $uploadSizeMb;
        
        if ($totalAfterUpload > $maxStorageMb) {
            Log::info('Tenant has exceeded storage limit', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'current_storage_mb' => $currentStorageMb,
                'upload_size_mb' => $uploadSizeMb,
                'total_after_upload_mb' => $totalAfterUpload,
                'max_storage_mb' => $maxStorageMb,
            ]);
            
            return response()->json([
                'error' => 'Storage Limit Exceeded',
                'message' => "You have reached your plan's storage limit of {$maxStorageMb}MB. Upgrade your plan to get more storage.",
                'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
            ], 402);
        }
        
        return null;
    }

    /**
     * Get current storage usage for a tenant.
     *
     * @param Tenant $tenant
     * @return float
     */
    private function getCurrentStorageUsage(Tenant $tenant): float
    {
        $disk = Config::get('billing.limits.storage.disk', 'public');
        $pathPattern = Config::get('billing.limits.storage.path_pattern', 'tenant_{tenant}');
        $path = str_replace('{tenant}', $tenant->id, $pathPattern);
        
        try {
            $totalSize = 0;
            $files = Storage::disk($disk)->allFiles($path);
            
            foreach ($files as $file) {
                $totalSize += Storage::disk($disk)->size($file);
            }
            
            return $totalSize / (1024 * 1024); // Convert to MB
        } catch (\Exception $e) {
            Log::error('Failed to calculate storage usage', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            
            return 0;
        }
    }

    /**
     * Check if tenant can access a specific feature.
     *
     * @param Tenant $tenant
     * @param Subscription $subscription
     * @param string $feature
     * @return Response|null
     */
    private function checkFeatureAccess(Tenant $tenant, Subscription $subscription, string $feature): ?Response
    {
        if (!$subscription->hasFeature($feature)) {
            Log::info('Tenant attempted to access restricted feature', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'feature' => $feature,
            ]);
            
            $featureName = $this->getFeatureDisplayName($feature);
            
            return response()->json([
                'error' => 'Feature Not Available',
                'message' => "The {$featureName} feature is not available in your current plan. Upgrade your plan to access this feature.",
                'upgrade_url' => Config::get('billing.limits.upgrade_url', '/billing/plans'),
            ], 403);
        }
        
        return null;
    }

    /**
     * Get a display-friendly name for a feature.
     *
     * @param string $feature
     * @return string
     */
    private function getFeatureDisplayName(string $feature): string
    {
        return match($feature) {
            'analytics' => 'Analytics',
            'api_access' => 'API Access',
            'advanced_integrations' => 'Advanced Integrations',
            'advanced_permissions' => 'Advanced Permissions',
            'custom_themes' => 'Custom Themes',
            'priority_support' => 'Priority Support',
            default => ucfirst(str_replace('_', ' ', $feature)),
        };
    }
}