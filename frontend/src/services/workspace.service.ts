import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface Workspace {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateWorkspaceRequest extends Partial<CreateWorkspaceRequest> {}

const WORKSPACES_QUERY_KEY = ['workspaces'];

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<{ data: Workspace[] }>('/workspaces');
      return response.data.data;
    },
  });
}

export function useWorkspace(id: number | string) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      const response = await apiClient.get<Workspace>(`/workspaces/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: number; data: CreateWorkspaceRequest }) => {
      const response = await apiClient.post<Workspace>(`/tenants/${tenantId}/workspaces`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateWorkspaceRequest }) => {
      const response = await apiClient.put<Workspace>(`/workspaces/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/workspaces/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
    },
  });
}
