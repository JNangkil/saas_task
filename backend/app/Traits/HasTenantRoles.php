<?php

namespace App\Traits;

use App\Models\Tenant;
use App\Models\User;

trait HasTenantRoles
{
    /**
     * Define the available tenant roles and their hierarchy
     */
    protected static $tenantRoles = [
        'owner' => [
            'level' => 4,
            'permissions' => [
                'view', 'update', 'delete', 'manage-users', 'manage-settings',
                'archive', 'reactivate', 'manage-billing', 'create-workspaces',
                'view-analytics', 'invite-users', 'remove-users', 'update-user-roles',
                'view-activity-logs', 'manage-subscription'
            ]
        ],
        'admin' => [
            'level' => 3,
            'permissions' => [
                'view', 'update', 'manage-users', 'manage-settings',
                'create-workspaces', 'view-analytics', 'invite-users',
                'remove-users', 'update-user-roles', 'view-activity-logs'
            ]
        ],
        'member' => [
            'level' => 2,
            'permissions' => [
                'view', 'create-workspaces'
            ]
        ],
        'viewer' => [
            'level' => 1,
            'permissions' => [
                'view'
            ]
        ]
    ];

    /**
     * Define the available workspace roles and their hierarchy
     */
    protected static $workspaceRoles = [
        'owner' => [
            'level' => 4,
            'permissions' => [
                'view', 'update', 'delete', 'archive', 'restore', 'manage-members',
                'add-members', 'remove-members', 'update-member-roles', 'manage-settings',
                'view-analytics', 'change-default', 'invite-users', 'manage-tasks',
                'view-tasks', 'export-data', 'duplicate'
            ]
        ],
        'admin' => [
            'level' => 3,
            'permissions' => [
                'view', 'update', 'archive', 'restore', 'manage-members',
                'add-members', 'remove-members', 'update-member-roles', 'manage-settings',
                'view-analytics', 'invite-users', 'manage-tasks', 'view-tasks',
                'export-data'
            ]
        ],
        'member' => [
            'level' => 2,
            'permissions' => [
                'view', 'create-boards', 'view-boards', 'manage-tasks', 'view-tasks'
            ]
        ],
        'viewer' => [
            'level' => 1,
            'permissions' => [
                'view', 'view-boards', 'view-tasks'
            ]
        ]
    ];

    /**
     * Get all available tenant roles
     */
    public static function getTenantRoles(): array
    {
        return array_keys(self::$tenantRoles);
    }

    /**
     * Get all available workspace roles
     */
    public static function getWorkspaceRoles(): array
    {
        return array_keys(self::$workspaceRoles);
    }

    /**
     * Get tenant role permissions
     */
    public static function getTenantRolePermissions(string $role): array
    {
        return self::$tenantRoles[$role]['permissions'] ?? [];
    }

    /**
     * Get workspace role permissions
     */
    public static function getWorkspaceRolePermissions(string $role): array
    {
        return self::$workspaceRoles[$role]['permissions'] ?? [];
    }

    /**
     * Check if a user has a specific permission in a tenant
     */
    public function hasTenantPermission(User $user, Tenant $tenant, string $permission): bool
    {
        $userRole = $tenant->getUserRole($user);
        if (!$userRole) {
            return false;
        }

        return in_array($permission, self::getTenantRolePermissions($userRole));
    }

    /**
     * Check if a user has a specific permission in a workspace
     */
    public function hasWorkspacePermission(User $user, $workspace, string $permission): bool
    {
        $userRole = $workspace->getUserRole($user);
        if (!$userRole) {
            return false;
        }

        return in_array($permission, self::getWorkspaceRolePermissions($userRole));
    }

    /**
     * Check if a user can manage another user's role in a tenant
     */
    public function canManageTenantUserRole(User $user, User $targetUser, Tenant $tenant): bool
    {
        $userRole = $tenant->getUserRole($user);
        $targetRole = $tenant->getUserRole($targetUser);

        if (!$userRole || !$targetRole) {
            return false;
        }

        $userLevel = self::$tenantRoles[$userRole]['level'] ?? 0;
        $targetLevel = self::$tenantRoles[$targetRole]['level'] ?? 0;

        // Users can only manage roles of users with lower or equal level
        // Only owners can manage other owners
        if ($targetRole === 'owner' && $userRole !== 'owner') {
            return false;
        }

        return $userLevel >= $targetLevel;
    }

    /**
     * Check if a user can manage another user's role in a workspace
     */
    public function canManageWorkspaceUserRole(User $user, User $targetUser, $workspace): bool
    {
        $userRole = $workspace->getUserRole($user);
        $targetRole = $workspace->getUserRole($targetUser);

        if (!$userRole || !$targetRole) {
            return false;
        }

        $userLevel = self::$workspaceRoles[$userRole]['level'] ?? 0;
        $targetLevel = self::$workspaceRoles[$targetRole]['level'] ?? 0;

        // Users can only manage roles of users with lower or equal level
        // Only owners can manage other owners
        if ($targetRole === 'owner' && $userRole !== 'owner') {
            return false;
        }

        return $userLevel >= $targetLevel;
    }

    /**
     * Get the role hierarchy level for a tenant role
     */
    public static function getTenantRoleLevel(string $role): int
    {
        return self::$tenantRoles[$role]['level'] ?? 0;
    }

    /**
     * Get the role hierarchy level for a workspace role
     */
    public static function getWorkspaceRoleLevel(string $role): int
    {
        return self::$workspaceRoles[$role]['level'] ?? 0;
    }

    /**
     * Check if a tenant role can perform a specific action
     */
    public static function canTenantRolePerform(string $role, string $action): bool
    {
        return in_array($action, self::getTenantRolePermissions($role));
    }

    /**
     * Check if a workspace role can perform a specific action
     */
    public static function canWorkspaceRolePerform(string $role, string $action): bool
    {
        return in_array($action, self::getWorkspaceRolePermissions($role));
    }
}