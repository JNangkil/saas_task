export interface IWorkspace {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    is_archived: boolean;
    is_default: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    user_role?: 'admin' | 'member' | 'viewer';
    member_count?: number;
}

export interface ITenant {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    billing_email?: string;
    settings?: Record<string, any>;
    status: 'active' | 'suspended' | 'deactivated';
    locale?: string;
    timezone?: string;
    created_at: string;
    updated_at: string;
    user_role?: 'owner' | 'admin' | 'member';
}

export interface IWorkspaceContext {
    currentTenant: ITenant | null;
    currentWorkspace: IWorkspace | null;
    userTenants: ITenant[];
    userWorkspaces: IWorkspace[];
    isLoading: boolean;
    error: string | null;
}

export interface IWorkspaceCreateRequest {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
}

export interface IWorkspaceUpdateRequest extends IWorkspaceCreateRequest {
    is_default?: boolean;
}

export interface IWorkspaceMember {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'member' | 'viewer';
    joined_at: string;
}