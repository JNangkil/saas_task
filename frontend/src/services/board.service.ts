import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

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

export interface UpdateBoardRequest extends Partial<CreateBoardRequest> {}

const BOARDS_QUERY_KEY = 'boards';

export function useBoards(workspaceId: number | string) {
  return useQuery({
    queryKey: [BOARDS_QUERY_KEY, 'workspace', workspaceId],
    queryFn: async () => {
      const response = await apiClient.get<Board[]>(`/tenants/:tenantId/workspaces/${workspaceId}/boards`);
      return response.data;
    },
    enabled: !!workspaceId,
  });
}

export function useBoard(workspaceId: number | string, boardId: number | string) {
  return useQuery({
    queryKey: [BOARDS_QUERY_KEY, workspaceId, boardId],
    queryFn: async () => {
      const response = await apiClient.get<Board>(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}`);
      return response.data;
    },
    enabled: !!workspaceId && !!boardId,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: number; data: CreateBoardRequest }) => {
      const response = await apiClient.post<Board>(`/tenants/:tenantId/workspaces/${workspaceId}/boards`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId, data }: { workspaceId: number; boardId: number; data: UpdateBoardRequest }) => {
      const response = await apiClient.put<Board>(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, variables.workspaceId, variables.boardId] });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId }: { workspaceId: number; boardId: number }) => {
      await apiClient.delete(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useFavoriteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId }: { workspaceId: number; boardId: number }) => {
      await apiClient.post(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}/favorite`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useUnfavoriteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId }: { workspaceId: number; boardId: number }) => {
      await apiClient.delete(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}/favorite`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useArchiveBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId }: { workspaceId: number; boardId: number }) => {
      const response = await apiClient.post<Board>(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}/archive`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}

export function useRestoreBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, boardId }: { workspaceId: number; boardId: number }) => {
      const response = await apiClient.post<Board>(`/tenants/:tenantId/workspaces/${workspaceId}/boards/${boardId}/restore`);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOARDS_QUERY_KEY, 'workspace', variables.workspaceId] });
    },
  });
}
