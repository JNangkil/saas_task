<?php

namespace App\Permissions;

class Permission
{
    // Tenant permissions
    public const TENANT_VIEW = 'tenant:view';
    public const TENANT_MANAGE = 'tenant:manage';
    public const TENANT_MANAGE_USERS = 'tenant:manage_users';
    public const TENANT_MANAGE_SETTINGS = 'tenant:manage_settings';
    public const TENANT_DELETE = 'tenant:delete';

    // Workspace permissions
    public const WORKSPACE_VIEW = 'workspace:view';
    public const WORKSPACE_MANAGE = 'workspace:manage';
    public const WORKSPACE_MANAGE_MEMBERS = 'workspace:manage_members';
    public const WORKSPACE_CREATE_BOARDS = 'workspace:create_boards';
    public const WORKSPACE_DELETE = 'workspace:delete';

    // Board permissions
    public const BOARD_VIEW = 'board:view';
    public const BOARD_MANAGE = 'board:manage';
    public const BOARD_CREATE_TASKS = 'board:create_tasks';
    public const BOARD_DELETE = 'board:delete';

    // Task permissions
    public const TASK_VIEW = 'task:view';
    public const TASK_CREATE = 'task:create';
    public const TASK_UPDATE = 'task:update';
    public const TASK_DELETE = 'task:delete';
    public const TASK_ASSIGN = 'task:assign';
    public const TASK_MANAGE_WATCHERS = 'task:manage_watchers';

    // Task comment permissions
    public const COMMENT_CREATE = 'comment:create';
    public const COMMENT_UPDATE = 'comment:update';
    public const COMMENT_DELETE = 'comment:delete';

    /**
     * Get all available permissions
     */
    public static function all(): array
    {
        return [
            // Tenant permissions
            self::TENANT_VIEW,
            self::TENANT_MANAGE,
            self::TENANT_MANAGE_USERS,
            self::TENANT_MANAGE_SETTINGS,
            self::TENANT_DELETE,

            // Workspace permissions
            self::WORKSPACE_VIEW,
            self::WORKSPACE_MANAGE,
            self::WORKSPACE_MANAGE_MEMBERS,
            self::WORKSPACE_CREATE_BOARDS,
            self::WORKSPACE_DELETE,

            // Board permissions
            self::BOARD_VIEW,
            self::BOARD_MANAGE,
            self::BOARD_CREATE_TASKS,
            self::BOARD_DELETE,

            // Task permissions
            self::TASK_VIEW,
            self::TASK_CREATE,
            self::TASK_UPDATE,
            self::TASK_DELETE,
            self::TASK_ASSIGN,
            self::TASK_MANAGE_WATCHERS,

            // Comment permissions
            self::COMMENT_CREATE,
            self::COMMENT_UPDATE,
            self::COMMENT_DELETE,
        ];
    }

    /**
     * Get permissions for a given role
     */
    public static function forRole(string $role): array
    {
        return match($role) {
            'owner' => [
                // All tenant permissions
                self::TENANT_VIEW,
                self::TENANT_MANAGE,
                self::TENANT_MANAGE_USERS,
                self::TENANT_MANAGE_SETTINGS,
                self::TENANT_DELETE,

                // All workspace permissions
                self::WORKSPACE_VIEW,
                self::WORKSPACE_MANAGE,
                self::WORKSPACE_MANAGE_MEMBERS,
                self::WORKSPACE_CREATE_BOARDS,
                self::WORKSPACE_DELETE,

                // All board permissions
                self::BOARD_VIEW,
                self::BOARD_MANAGE,
                self::BOARD_CREATE_TASKS,
                self::BOARD_DELETE,

                // All task permissions
                self::TASK_VIEW,
                self::TASK_CREATE,
                self::TASK_UPDATE,
                self::TASK_DELETE,
                self::TASK_ASSIGN,
                self::TASK_MANAGE_WATCHERS,

                // All comment permissions
                self::COMMENT_CREATE,
                self::COMMENT_UPDATE,
                self::COMMENT_DELETE,
            ],

            'admin' => [
                // Most tenant permissions except delete
                self::TENANT_VIEW,
                self::TENANT_MANAGE,
                self::TENANT_MANAGE_USERS,
                self::TENANT_MANAGE_SETTINGS,

                // All workspace permissions except delete
                self::WORKSPACE_VIEW,
                self::WORKSPACE_MANAGE,
                self::WORKSPACE_MANAGE_MEMBERS,
                self::WORKSPACE_CREATE_BOARDS,

                // All board permissions
                self::BOARD_VIEW,
                self::BOARD_MANAGE,
                self::BOARD_CREATE_TASKS,
                self::BOARD_DELETE,

                // All task permissions
                self::TASK_VIEW,
                self::TASK_CREATE,
                self::TASK_UPDATE,
                self::TASK_DELETE,
                self::TASK_ASSIGN,
                self::TASK_MANAGE_WATCHERS,

                // All comment permissions
                self::COMMENT_CREATE,
                self::COMMENT_UPDATE,
                self::COMMENT_DELETE,
            ],

            'member' => [
                // View permissions
                self::TENANT_VIEW,
                self::WORKSPACE_VIEW,
                self::BOARD_VIEW,
                self::TASK_VIEW,

                // Create permissions
                self::WORKSPACE_CREATE_BOARDS,
                self::BOARD_CREATE_TASKS,
                self::COMMENT_CREATE,

                // Update permissions for own content
                self::TASK_UPDATE,
                self::COMMENT_UPDATE,

                // Delete permissions for own content
                self::TASK_DELETE,
                self::COMMENT_DELETE,

                // Task-related permissions
                self::TASK_ASSIGN,
                self::TASK_MANAGE_WATCHERS,
            ],

            default => [],
        };
    }
}