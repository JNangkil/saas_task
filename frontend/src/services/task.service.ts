import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface Task {
  id: number;
  tenant_id: number;
  workspace_id: number;
  board_id?: number;
  column_id?: number;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: number;
  creator_id?: number;
  due_date?: string;
  start_date?: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  custom_field_values?: Record<string, any>;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee_id?: number;
  creator_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  start_date_from?: string;
  start_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  labels?: string;
  include_archived?: boolean;
}

export interface TaskSort {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TasksPaginatedResponse {
  data: Task[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  board_id?: number;
  column_id?: number;
  status?: string;
  priority?: string;
  assignee_id?: number;
  due_date?: string;
  start_date?: string;
  position?: number;
  custom_field_values?: Record<string, any>;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

const TASKS_QUERY_KEY = 'tasks';

export function useTasks(
  workspaceId: number | string,
  boardId?: number | string,
  filters?: TaskFilters,
  sort?: TaskSort,
  page: number = 1,
  perPage: number = 15
) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, 'workspace', workspaceId, 'board', boardId, filters, sort, page, perPage],
    queryFn: async () => {
      let endpoint = `/tenants/:tenantId/workspaces/${workspaceId}`;
      
      if (boardId) {
        endpoint += `/boards/${boardId}/tasks`;
      } else {
        endpoint += `/tasks`;
      }

      const params: any = {
        page: page.toString(),
        per_page: perPage.toString(),
      };

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params[key] = value;
          }
        });
      }

      if (sort) {
        if (sort.sort_by) params.sort_by = sort.sort_by;
        if (sort.sort_order) params.sort_order = sort.sort_order;
      }

      const response = await apiClient.get<TasksPaginatedResponse>(endpoint, { params });
      return response.data;
    },
    enabled: !!workspaceId,
  });
}

export function useTask(workspaceId: number | string, taskId: number | string) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, workspaceId, taskId],
    queryFn: async () => {
      const response = await apiClient.get<Task>(`/tenants/:tenantId/workspaces/${workspaceId}/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!workspaceId && !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId, data }: { workspaceId: number; boardId?: number; data: CreateTaskRequest }) => {
      let endpoint = `/tenants/:tenantId/workspaces/${workspaceId}/tasks`;
      
      if (boardId) {
        endpoint = `/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}/tasks`;
      }

      const response = await apiClient.post<Task>(endpoint, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId] });
      if (variables.boardId) {
        queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId, 'board', variables.boardId] });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, taskId, data }: { workspaceId: number; taskId: number; data: UpdateTaskRequest }) => {
      const response = await apiClient.put<Task>(`/tenants/:tenantId/workspaces/${workspaceId}/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, variables.workspaceId, variables.taskId] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, taskId }: { workspaceId: number; taskId: number }) => {
      await apiClient.delete(`/tenants/:tenantId/workspaces/${workspaceId}/tasks/${taskId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, taskId }: { workspaceId: number; taskId: number }) => {
      const response = await apiClient.put<Task>(`/tenants/:tenantId/workspaces/${workspaceId}/tasks/${taskId}`, {
        is_archived: true,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useUpdateTaskPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      taskId, 
      position, 
      columnId 
    }: { 
      workspaceId: number; 
      taskId: number; 
      position: number; 
      columnId?: number;
    }) => {
      const response = await apiClient.put<Task>(`/tenants/:tenantId/workspaces/${workspaceId}/tasks/${taskId}`, {
        position,
        column_id: columnId,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}
