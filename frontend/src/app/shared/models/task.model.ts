export type TaskStatus = 'backlog' | 'in-progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
  createdAt: string;
  updatedAt: string;
}
