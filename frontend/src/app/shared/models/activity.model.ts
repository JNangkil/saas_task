export interface Activity {
  id: string;
  actorId: string;
  action: 'created' | 'updated' | 'commented' | 'completed';
  targetType: 'task' | 'project';
  targetId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
