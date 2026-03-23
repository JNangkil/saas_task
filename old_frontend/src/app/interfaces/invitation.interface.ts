export interface IInvitation {
    id: string;
    workspace_id: string;
    email: string;
    role: 'admin' | 'member' | 'viewer';
    token: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    invited_by: string;
    invited_by_user?: {
        id: string;
        name: string;
        email: string;
    };
    expires_at: string;
    accepted_at?: string;
    declined_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ICreateInvitationRequest {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    message?: string;
}

export interface IInvitationDetails {
    invitation: IInvitation;
    workspace: {
        id: string;
        name: string;
        description?: string;
    };
    invited_by_user: {
        id: string;
        name: string;
        email: string;
    };
}

export interface IAcceptInvitationRequest {
    name?: string;
}

export interface IInvitationListResponse {
    invitations: IInvitation[];
    total: number;
    page: number;
    per_page: number;
}