/**
 * Interface for Task entity
 */
export interface Task {
    id: number;
    tenant_id: number;
    workspace_id: number;
    board_id?: number;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: number;
    creator_id: number;
    due_date?: string;
    start_date?: string;
    completed_at?: string;
    archived_at?: string;
    position: number;
    created_at: string;
    updated_at: string;
    labels?: Label[];
    custom_values?: TaskCustomValue[];
    assignee?: User;
    creator?: User;
    board?: Board;
    workspace?: Workspace;
    comments?: TaskComment[];
}

/**
 * Interface for Label entity
 */
export interface Label {
    id: number;
    name: string;
    color: string;
    tenant_id: number;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for TaskCustomValue entity
 */
export interface TaskCustomValue {
    id: number;
    task_id: number;
    field_name: string;
    field_type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    value: any;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for User entity
 */
export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for Board entity
 */
export interface Board {
    id: number;
    name: string;
    tenant_id: number;
    workspace_id: number;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for Workspace entity
 */
export interface Workspace {
    id: number;
    name: string;
    tenant_id: number;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for TaskComment entity
 */
export interface TaskComment {
    id: number;
    task_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for Task filtering options
 */
export interface TaskFilters {
    search?: string;
    status?: string[];
    priority?: string[];
    assignee_id?: number[];
    creator_id?: number[];
    due_date_from?: string;
    due_date_to?: string;
    start_date_from?: string;
    start_date_to?: string;
    created_at_from?: string;
    created_at_to?: string;
    labels?: number[];
    include_archived?: boolean;
}

/**
 * Interface for Task sorting options
 */
export interface TaskSort {
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

/**
 * Interface for Task creation payload
 */
export interface TaskCreate {
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: number;
    board_id?: number;
    due_date?: string;
    start_date?: string;
    position?: number;
    labels?: number[];
    custom_values?: {
        field_name: string;
        field_type: 'text' | 'number' | 'date' | 'boolean' | 'select';
        value: any;
    }[];
}

/**
 * Interface for Task update payload
 */
export interface TaskUpdate {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: number;
    board_id?: number;
    due_date?: string;
    start_date?: string;
    position?: number;
    labels?: number[];
    custom_values?: {
        field_name: string;
        field_type: 'text' | 'number' | 'date' | 'boolean' | 'select';
        value: any;
    }[];
}

/**
 * Interface for Task position update
 */
export interface TaskPositionUpdate {
    position: number;
    board_id?: number;
    status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Interface for Paginated Tasks Response
 */
export interface TasksPaginatedResponse {
    data: Task[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url?: string;
    prev_page_url?: string;
}