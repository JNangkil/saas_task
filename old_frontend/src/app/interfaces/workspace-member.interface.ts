export interface IWorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joined_at: string;
    created_at: string;
    updated_at: string;
}

export interface IRoleUpdate {
    role: 'admin' | 'member' | 'viewer';
}

export interface IOwnershipTransfer {
    user_id: string;
}

export interface IUserPermissions {
    workspace_id: string;
    user_id: string;
    permissions: {
        can_view: boolean;
        can_edit: boolean;
        can_delete: boolean;
        can_manage_members: boolean;
        can_manage_settings: boolean;
        can_invite_members: boolean;
        can_transfer_ownership: boolean;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface IMemberListResponse {
    members: IWorkspaceMember[];
    total: number;
    page: number;
    per_page: number;
}

export interface IMemberInviteRequest {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    message?: string;
}