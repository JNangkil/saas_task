<?php

namespace App\Services;

use App\Permissions\Permission;
use App\Models\Tenant;
use App\Models\Workspace;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class PermissionService
{
    /**
     * Check if the current user has a specific permission for a tenant
     */
    public static function hasTenantPermission(string $permission, ?Tenant $tenant = null): bool
    {
        $user = Auth::user();
        $tenant = $tenant ?? tenant();

        if (!$user || !$tenant) {
            return false;
        }

        // Super admins have all permissions
        if ($user->isSuperAdmin()) {
            return true;
        }

        $role = $user->getTenantRole($tenant);
        if (!$role) {
            return false;
        }

        $permissions = Permission::forRole($role);
        return in_array($permission, $permissions);
    }

    /**
     * Check if the current user has a specific permission for a workspace
     */
    public static function hasWorkspacePermission(string $permission, Workspace $workspace): bool
    {
        $user = Auth::user();

        if (!$user) {
            return false;
        }

        // Super admins have all permissions
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Check tenant permissions first
        if (!self::hasTenantPermission(Permission::WORKSPACE_VIEW, $workspace->tenant)) {
            return false;
        }

        $role = $user->getWorkspaceRole($workspace);
        if (!$role) {
            // Fall back to tenant permissions if no explicit workspace role
            return self::hasTenantPermission($permission, $workspace->tenant);
        }

        $permissions = Permission::forRole($role);
        return in_array($permission, $permissions);
    }

    /**
     * Check if a user can manage a specific tenant
     */
    public static function canManageTenant(Tenant $tenant): bool
    {
        return self::hasTenantPermission(Permission::TENANT_MANAGE, $tenant);
    }

    /**
     * Check if a user can manage users in a specific tenant
     */
    public static function canManageTenantUsers(Tenant $tenant): bool
    {
        return self::hasTenantPermission(Permission::TENANT_MANAGE_USERS, $tenant);
    }

    /**
     * Check if a user can create boards in a workspace
     */
    public static function canCreateBoardsInWorkspace(Workspace $workspace): bool
    {
        return self::hasWorkspacePermission(Permission::WORKSPACE_CREATE_BOARDS, $workspace);
    }

    /**
     * Check if a user can view a board
     */
    public static function canViewBoard($board): bool
    {
        return self::hasWorkspacePermission(Permission::BOARD_VIEW, $board->workspace);
    }

    /**
     * Check if a user can manage a board
     */
    public static function canManageBoard($board): bool
    {
        return self::hasWorkspacePermission(Permission::BOARD_MANAGE, $board->workspace);
    }

    /**
     * Check if a user can create tasks in a board
     */
    public static function canCreateTasksInBoard($board): bool
    {
        return self::hasWorkspacePermission(Permission::BOARD_CREATE_TASKS, $board->workspace);
    }

    /**
     * Check if a user can assign tasks
     */
    public static function canAssignTask($task): bool
    {
        return self::hasWorkspacePermission(Permission::TASK_ASSIGN, $task->workspace);
    }

    /**
     * Check if a user can manage watchers on a task
     */
    public static function canManageTaskWatchers($task): bool
    {
        return self::hasWorkspacePermission(Permission::TASK_MANAGE_WATCHERS, $task->workspace);
    }

    /**
     * Get all permissions for the current user in a specific context
     */
    public static function getUserPermissions(?Tenant $tenant = null, ?Workspace $workspace = null): array
    {
        $user = Auth::user();
        if (!$user) {
            return [];
        }

        // Super admins have all permissions
        if ($user->isSuperAdmin()) {
            return Permission::all();
        }

        $permissions = [];

        if ($tenant) {
            $role = $user->getTenantRole($tenant);
            if ($role) {
                $permissions = array_merge($permissions, Permission::forRole($role));
            }
        }

        if ($workspace) {
            $role = $user->getWorkspaceRole($workspace);
            if ($role) {
                $permissions = array_merge($permissions, Permission::forRole($role));
            }
        }

        return array_unique($permissions);
    }
}