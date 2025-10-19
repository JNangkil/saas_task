import { TaskStatus } from './task.model';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: 'active' | 'archived';
  taskStatusSummary?: Partial<Record<TaskStatus, number>>;
  createdAt: string;
  updatedAt: string;
}
