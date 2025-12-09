/**
 * User entity interface
 */
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_super_admin?: boolean;
    job_title?: string;
    timezone?: string;
    locale?: string;
    status?: 'active' | 'suspended' | 'pending';
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

/**
 * User profile interface
 */
export interface UserProfile extends User {
    // Additional profile-specific fields can be added here
}

/**
 * User update payload
 */
export interface UserUpdate {
    name?: string;
    job_title?: string;
    timezone?: string;
    locale?: string;
}

/**
 * User avatar update payload
 */
export interface UserAvatarUpdate {
    avatar?: File;
}

/**
 * Tenant user interface
 */
export interface TenantUser extends User {
    pivot: {
        tenant_id: number;
        user_id: number;
        role: 'owner' | 'admin' | 'member' | 'viewer';
        joined_at: string;
        created_at: string;
        updated_at: string;
    };
}

/**
 * Tenant user update payload
 */
export interface TenantUserUpdate {
    role?: 'owner' | 'admin' | 'member' | 'viewer';
    status?: 'active' | 'suspended' | 'pending';
}

/**
 * Permission enum
 */
export enum Permission {
    // Tenant permissions
    TENANT_MANAGE_USERS = 'tenant:manage_users',
    TENANT_MANAGE_SETTINGS = 'tenant:manage_settings',
    TENANT_MANAGE_SUBSCRIPTION = 'tenant:manage_subscription',
    TENANT_VIEW_ANALYTICS = 'tenant:view_analytics',
    TENANT_CREATE_WORKSPACES = 'tenant:create_workspaces',
    TENANT_MANAGE_WORKSPACES = 'tenant:manage_workspaces',

    // Workspace permissions
    WORKSPACE_MANAGE = 'workspace:manage',
    WORKSPACE_MANAGE_SETTINGS = 'workspace:manage_settings',
    WORKSPACE_MANAGE_BOARDS = 'workspace:manage_boards',
    WORKSPACE_CREATE_BOARDS = 'workspace:create_boards',
    WORKSPACE_DELETE_BOARDS = 'workspace:delete_boards',
    WORKSPACE_CREATE_TASKS = 'workspace:create_tasks',
    WORKSPACE_ASSIGN_TASKS = 'workspace:assign_tasks',
    WORKSPACE_DELETE_TASKS = 'workspace:delete_tasks',
    WORKSPACE_MANAGE_COMMENTS = 'workspace:manage_comments',
    WORKSPACE_VIEW_ANALYTICS = 'workspace:view_analytics',
    WORKSPACE_INVITE_MEMBERS = 'workspace:invite_members',
    WORKSPACE_REMOVE_MEMBERS = 'workspace:remove_members',

    // Board permissions
    BOARD_VIEW = 'board:view',
    BOARD_MANAGE = 'board:manage',
    BOARD_CREATE_TASKS = 'board:create_tasks',
    BOARD_MANAGE_TASKS = 'board:manage_tasks',
    BOARD_DELETE_TASKS = 'board:delete_tasks',

    // Task permissions
    TASK_VIEW = 'task:view',
    TASK_CREATE = 'task:create',
    TASK_UPDATE = 'task:update',
    TASK_DELETE = 'task:delete',
    TASK_ASSIGN = 'task:assign',
    TASK_MANAGE_WATCHERS = 'task:manage_watchers',
    TASK_ADD_COMMENTS = 'task:add_comments',
    TASK_MANAGE_COMMENTS = 'task:manage_comments',

    // Comment permissions
    COMMENT_VIEW = 'comment:view',
    COMMENT_CREATE = 'comment:create',
    COMMENT_UPDATE = 'comment:update',
    COMMENT_DELETE = 'comment:delete',

    // User permissions
    USER_VIEW_PROFILE = 'user:view_profile',
    USER_UPDATE_OWN_PROFILE = 'user:update_own_profile',
    USER_MANAGE_AVATAR = 'user:manage_avatar',
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    super_admin: Object.values(Permission),

    owner: [
        Permission.TENANT_MANAGE_USERS,
        Permission.TENANT_MANAGE_SETTINGS,
        Permission.TENANT_MANAGE_SUBSCRIPTION,
        Permission.TENANT_VIEW_ANALYTICS,
        Permission.TENANT_CREATE_WORKSPACES,
        Permission.TENANT_MANAGE_WORKSPACES,
        Permission.WORKSPACE_MANAGE,
        Permission.WORKSPACE_MANAGE_SETTINGS,
        Permission.WORKSPACE_MANAGE_BOARDS,
        Permission.WORKSPACE_CREATE_BOARDS,
        Permission.WORKSPACE_DELETE_BOARDS,
        Permission.WORKSPACE_CREATE_TASKS,
        Permission.WORKSPACE_ASSIGN_TASKS,
        Permission.WORKSPACE_DELETE_TASKS,
        Permission.WORKSPACE_MANAGE_COMMENTS,
        Permission.WORKSPACE_VIEW_ANALYTICS,
        Permission.WORKSPACE_INVITE_MEMBERS,
        Permission.WORKSPACE_REMOVE_MEMBERS,
        Permission.BOARD_VIEW,
        Permission.BOARD_MANAGE,
        Permission.BOARD_CREATE_TASKS,
        Permission.BOARD_MANAGE_TASKS,
        Permission.BOARD_DELETE_TASKS,
        Permission.TASK_VIEW,
        Permission.TASK_CREATE,
        Permission.TASK_UPDATE,
        Permission.TASK_DELETE,
        Permission.TASK_ASSIGN,
        Permission.TASK_MANAGE_WATCHERS,
        Permission.TASK_ADD_COMMENTS,
        Permission.TASK_MANAGE_COMMENTS,
        Permission.COMMENT_VIEW,
        Permission.COMMENT_CREATE,
        Permission.COMMENT_UPDATE,
        Permission.COMMENT_DELETE,
        Permission.USER_VIEW_PROFILE,
        Permission.USER_UPDATE_OWN_PROFILE,
        Permission.USER_MANAGE_AVATAR,
    ],

    admin: [
        Permission.TENANT_VIEW_ANALYTICS,
        Permission.TENANT_CREATE_WORKSPACES,
        Permission.WORKSPACE_MANAGE,
        Permission.WORKSPACE_MANAGE_SETTINGS,
        Permission.WORKSPACE_MANAGE_BOARDS,
        Permission.WORKSPACE_CREATE_BOARDS,
        Permission.WORKSPACE_DELETE_BOARDS,
        Permission.WORKSPACE_CREATE_TASKS,
        Permission.WORKSPACE_ASSIGN_TASKS,
        Permission.WORKSPACE_DELETE_TASKS,
        Permission.WORKSPACE_MANAGE_COMMENTS,
        Permission.WORKSPACE_VIEW_ANALYTICS,
        Permission.WORKSPACE_INVITE_MEMBERS,
        Permission.BOARD_VIEW,
        Permission.BOARD_MANAGE,
        Permission.BOARD_CREATE_TASKS,
        Permission.BOARD_MANAGE_TASKS,
        Permission.BOARD_DELETE_TASKS,
        Permission.TASK_VIEW,
        Permission.TASK_CREATE,
        Permission.TASK_UPDATE,
        Permission.TASK_DELETE,
        Permission.TASK_ASSIGN,
        Permission.TASK_MANAGE_WATCHERS,
        Permission.TASK_ADD_COMMENTS,
        Permission.TASK_MANAGE_COMMENTS,
        Permission.COMMENT_VIEW,
        Permission.COMMENT_CREATE,
        Permission.COMMENT_UPDATE,
        Permission.COMMENT_DELETE,
        Permission.USER_VIEW_PROFILE,
        Permission.USER_UPDATE_OWN_PROFILE,
        Permission.USER_MANAGE_AVATAR,
    ],

    member: [
        Permission.WORKSPACE_CREATE_TASKS,
        Permission.WORKSPACE_ASSIGN_TASKS,
        Permission.BOARD_VIEW,
        Permission.BOARD_CREATE_TASKS,
        Permission.TASK_VIEW,
        Permission.TASK_CREATE,
        Permission.TASK_UPDATE,
        Permission.TASK_ASSIGN,
        Permission.TASK_MANAGE_WATCHERS,
        Permission.TASK_ADD_COMMENTS,
        Permission.COMMENT_VIEW,
        Permission.COMMENT_CREATE,
        Permission.COMMENT_UPDATE,
        Permission.USER_VIEW_PROFILE,
        Permission.USER_UPDATE_OWN_PROFILE,
        Permission.USER_MANAGE_AVATAR,
    ],

    viewer: [
        Permission.BOARD_VIEW,
        Permission.TASK_VIEW,
        Permission.COMMENT_VIEW,
        Permission.USER_VIEW_PROFILE,
        Permission.USER_UPDATE_OWN_PROFILE,
        Permission.USER_MANAGE_AVATAR,
    ],
};

/**
 * In-app notification interface
 */
export interface Notification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: {
        type: string;
        task_id?: number;
        task_title?: string;
        assigned_by?: {
            id: number;
            name: string;
        };
        added_by?: {
            id: number;
            name: string;
        };
        tenant_id?: number;
        workspace_id?: number;
        board_id?: number;
    };
    read_at?: string;
    created_at: string;
}

/**
 * Paginated notifications response
 */
export interface NotificationsPaginatedResponse {
    data: Notification[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url?: string;
    prev_page_url?: string;
}

/**
 * Notification count response
 */
export interface NotificationCount {
    count: number;
}