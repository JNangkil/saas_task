<?php

use App\Models\Tenant;
use App\Models\Workspace;
use Illuminate\Support\Facades\Auth;

if (!function_exists('tenant')) {
    /**
     * Get the current tenant instance.
     *
     * @return \App\Models\Tenant|null
     */
    function tenant()
    {
        return app('current_tenant');
    }
}

if (!function_exists('tenant_id')) {
    /**
     * Get the current tenant ID.
     *
     * @return int|null
     */
    function tenant_id()
    {
        $tenant = tenant();
        return $tenant ? $tenant->id : null;
    }
}

if (!function_exists('has_tenant')) {
    /**
     * Check if there is a current tenant context.
     *
     * @return bool
     */
    function has_tenant()
    {
        return tenant() !== null;
    }
}

if (!function_exists('require_tenant')) {
    /**
     * Get the current tenant or throw an exception if none exists.
     *
     * @return \App\Models\Tenant
     * @throws \Exception
     */
    function require_tenant()
    {
        $tenant = tenant();
        if (!$tenant) {
            throw new \Exception('Tenant context is required but not available');
        }
        return $tenant;
    }
}

if (!function_exists('tenant_user_role')) {
    /**
     * Get the current user's role in the current tenant.
     *
     * @return string|null
     */
    function tenant_user_role()
    {
        if (!Auth::check() || !tenant()) {
            return null;
        }
        
        return tenant()->getUserRole(Auth::user());
    }
}

if (!function_exists('tenant_user_can')) {
    /**
     * Check if the current user can perform an action in the current tenant.
     *
     * @param string $action
     * @return bool
     */
    function tenant_user_can(string $action): bool
    {
        if (!Auth::check() || !tenant()) {
            return false;
        }

        $user = Auth::user();
        $tenant = tenant();
        $role = $tenant->getUserRole($user);

        switch ($action) {
            case 'manage':
                return in_array($role, ['owner', 'admin']);
            case 'create_workspaces':
                return in_array($role, ['owner', 'admin', 'member']);
            case 'view':
                return in_array($role, ['owner', 'admin', 'member', 'viewer']);
            default:
                return false;
        }
    }
}

if (!function_exists('tenant_is_active')) {
    /**
     * Check if the current tenant is active.
     *
     * @return bool
     */
    function tenant_is_active(): bool
    {
        return tenant() ? tenant()->isActive() : false;
    }
}

if (!function_exists('tenant_has_subscription')) {
    /**
     * Check if the current tenant has an active subscription.
     *
     * @return bool
     */
    function tenant_has_subscription(): bool
    {
        return tenant() ? tenant()->hasActiveSubscription() : false;
    }
}

if (!function_exists('tenant_can_use_feature')) {
    /**
     * Check if the current tenant can use a specific feature.
     *
     * @param string $feature
     * @return bool
     */
    function tenant_can_use_feature(string $feature): bool
    {
        return tenant() ? tenant()->canUseFeature($feature) : false;
    }
}

if (!function_exists('tenant_plan_limits')) {
    /**
     * Get the current tenant's plan limits.
     *
     * @return array
     */
    function tenant_plan_limits(): array
    {
        return tenant() ? tenant()->getPlanLimits() : [];
    }
}

if (!function_exists('current_workspace')) {
    /**
     * Get the current workspace instance.
     * This will be implemented with workspace context service.
     *
     * @return \App\Models\Workspace|null
     */
    function current_workspace()
    {
        // This will be implemented with workspace context service
        // For now, return null
        return null;
    }
}

if (!function_exists('current_workspace_id')) {
    /**
     * Get the current workspace ID.
     *
     * @return int|null
     */
    function current_workspace_id()
    {
        $workspace = current_workspace();
        return $workspace ? $workspace->id : null;
    }
}

if (!function_exists('has_workspace')) {
    /**
     * Check if there is a current workspace context.
     *
     * @return bool
     */
    function has_workspace()
    {
        return current_workspace() !== null;
    }
}

if (!function_exists('require_workspace')) {
    /**
     * Get the current workspace or throw an exception if none exists.
     *
     * @return \App\Models\Workspace
     * @throws \Exception
     */
    function require_workspace()
    {
        $workspace = current_workspace();
        if (!$workspace) {
            throw new \Exception('Workspace context is required but not available');
        }
        return $workspace;
    }
}

if (!function_exists('workspace_user_role')) {
    /**
     * Get the current user's role in the current workspace.
     *
     * @return string|null
     */
    function workspace_user_role()
    {
        if (!Auth::check() || !current_workspace()) {
            return null;
        }
        
        return current_workspace()->getUserRole(Auth::user());
    }
}

if (!function_exists('workspace_user_can')) {
    /**
     * Check if the current user can perform an action in the current workspace.
     *
     * @param string $action
     * @return bool
     */
    function workspace_user_can(string $action): bool
    {
        if (!Auth::check() || !current_workspace()) {
            return false;
        }

        $user = Auth::user();
        $workspace = current_workspace();
        $role = $workspace->getUserRole($user);

        switch ($action) {
            case 'manage':
                return in_array($role, ['admin']);
            case 'create_boards':
                return in_array($role, ['admin', 'member']);
            case 'view':
                return in_array($role, ['admin', 'member', 'viewer']);
            default:
                return false;
        }
    }
}

if (!function_exists('set_tenant_context')) {
    /**
     * Set the tenant context for the current request.
     *
     * @param \App\Models\Tenant $tenant
     * @return void
     */
    function set_tenant_context(Tenant $tenant): void
    {
        app()->instance('current_tenant', $tenant);
    }
}

if (!function_exists('clear_tenant_context')) {
    /**
     * Clear the tenant context for the current request.
     *
     * @return void
     */
    function clear_tenant_context(): void
    {
        app()->instance('current_tenant', null);
    }
}

if (!function_exists('with_tenant')) {
    /**
     * Execute a callback within a specific tenant context.
     *
     * @param \App\Models\Tenant $tenant
     * @param callable $callback
     * @return mixed
     */
    function with_tenant(Tenant $tenant, callable $callback)
    {
        $originalTenant = tenant();
        set_tenant_context($tenant);
        
        try {
            return $callback();
        } finally {
            set_tenant_context($originalTenant);
        }
    }
}

if (!function_exists('without_tenant_scope')) {
    /**
     * Execute a callback without tenant scoping.
     * Useful for system operations that need to access all data.
     *
     * @param callable $callback
     * @return mixed
     */
    function without_tenant_scope(callable $callback)
    {
        $originalTenant = tenant();
        clear_tenant_context();
        
        try {
            return $callback();
        } finally {
            if ($originalTenant) {
                set_tenant_context($originalTenant);
            }
        }
    }
}