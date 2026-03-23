/**
 * Workspace entity interface
 */
export interface Workspace {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  tenant_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

/**
 * Board entity interface
 */
export interface Board {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: 'kanban' | 'list' | 'calendar' | 'timeline';
  is_favorite: boolean;
  is_archived: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

/**
 * Task entity interface
 */
export interface Task {
  id: number;
  board_id: number;
  workspace_id: number;
  title: string;
  description?: string;
  status: 'to_do' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  column_id?: number;
  assignee_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
}
