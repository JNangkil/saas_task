<?php

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