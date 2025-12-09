<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Workspace Roles and Permissions
    |--------------------------------------------------------------------------
    |
    | This file defines the role hierarchy and permission matrix for workspace
    | members. Each role has a specific set of permissions that determine what
    | actions a user can perform within a workspace.
    |
    */

    'roles' => [
        'owner' => [
            'name' => 'Owner',
            'description' => 'Full control over the workspace',
            'weight' => 100,
            'permissions' => [
                'workspace.manage',
                'workspace.delete',
                'workspace.settings',
                'members.invite',
                'members.remove',
                'members.manage',
                'boards.create',
                'boards.manage',
                'boards.delete',
                'boards.archive',
                'tasks.create',
                'tasks.assign',
                'tasks.delete',
                'comments.manage',
                'analytics.view',
            ],
        ],
        'admin' => [
            'name' => 'Admin',
            'description' => 'Can manage most aspects of the workspace',
            'weight' => 80,
            'permissions' => [
                'workspace.manage',
                'workspace.settings',
                'members.invite',
                'members.remove',
                'members.manage',
                'boards.create',
                'boards.manage',
                'boards.delete',
                'boards.archive',
                'tasks.create',
                'tasks.assign',
                'tasks.delete',
                'comments.manage',
                'analytics.view',
            ],
        ],
        'member' => [
            'name' => 'Member',
            'description' => 'Standard workspace participant',
            'weight' => 50,
            'permissions' => [
                'boards.create',
                'boards.manage',
                'boards.archive',
                'tasks.create',
                'tasks.assign',
                'comments.manage',
            ],
        ],
        'viewer' => [
            'name' => 'Viewer',
            'description' => 'Read-only access to workspace content',
            'weight' => 20,
            'permissions' => [
                // No write permissions, only view access
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission Definitions
    |--------------------------------------------------------------------------
    |
    | Detailed descriptions of each permission and what it allows.
    |
    */
    'permissions' => [
        'workspace.manage' => 'Manage workspace settings and configuration',
        'workspace.delete' => 'Delete the entire workspace',
        'workspace.settings' => 'Access and modify workspace settings',
        'members.invite' => 'Invite new members to the workspace',
        'members.remove' => 'Remove existing members from the workspace',
        'members.manage' => 'Change member roles and permissions',
        'boards.create' => 'Create new boards in the workspace',
        'boards.manage' => 'Edit and manage existing boards',
        'boards.delete' => 'Delete boards from the workspace',
        'boards.archive' => 'Archive boards to hide them from active view',
        'tasks.create' => 'Create new tasks on boards',
        'tasks.assign' => 'Assign tasks to users and change assignments',
        'tasks.delete' => 'Delete tasks from boards',
        'comments.manage' => 'Create, edit, and delete comments',
        'analytics.view' => 'View workspace analytics and reports',
    ],

    /*
    |--------------------------------------------------------------------------
    | Role Inheritance
    |--------------------------------------------------------------------------
    |
    | Define which roles inherit permissions from lower-level roles.
    | This allows for easier permission management.
    |
    */
    'inheritance' => [
        'admin' => ['member', 'viewer'],
        'member' => ['viewer'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Settings
    |--------------------------------------------------------------------------
    |
    | Default values for workspace invitation and membership settings.
    |
    */
    'defaults' => [
        'invitation_expiry_days' => 7,
        'max_pending_invitations' => 50,
        'allow_member_invitations' => true, // Can members invite others?
    ],
];