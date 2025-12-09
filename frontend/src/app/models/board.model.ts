import { BoardColumn } from './board-column.model';

export interface Board {
    id: number;
    tenant_id: number;
    workspace_id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type: 'kanban' | 'list' | 'calendar';
    position: number;
    is_archived: boolean;
    is_favorite?: boolean;
    created_by?: any; // User type
    created_at: string;
    updated_at: string;
    columns?: BoardColumn[];
}

export interface BoardTemplate {
    id: number;
    tenant_id?: number;
    name: string;
    description?: string;
    icon?: string;
    config: {
        columns: {
            name: string;
            color: string;
            limit?: number;
        }[];
        tasks?: any[];
    };
    is_global: boolean;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateBoardRequest {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type: 'kanban' | 'list' | 'calendar';
    template_id?: number;
}
