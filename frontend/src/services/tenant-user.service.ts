import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { TenantUser, TenantUserUpdate } from '@/lib/models/user.model';

/**
 * Tenant User API Service
 */
class TenantUserService {
  /**
   * Get all users in a tenant
   */
  async getTenantUsers(tenantId: number): Promise<TenantUser[]> {
    const response = await apiClient.get<TenantUser[]>(`/tenants/${tenantId}/users`);
    return response.data;
  }

  /**
   * Update user role or status in a tenant
   */
  async updateTenantUser(tenantId: number, userId: number, data: TenantUserUpdate): Promise<TenantUser> {
    const response = await apiClient.patch<TenantUser>(`/tenants/${tenantId}/users/${userId}`, data);
    return response.data;
  }

  /**
   * Remove a user from a tenant
   */
  async removeUserFromTenant(tenantId: number, userId: number): Promise<void> {
    await apiClient.delete(`/tenants/${tenantId}/users/${userId}`);
  }
}

export const tenantUserService = new TenantUserService();

/**
 * React Query hooks for tenant users
 */
export const useTenantUsers = (tenantId: number) => {
  return useQuery({
    queryKey: ['tenants', tenantId, 'users'],
    queryFn: () => tenantUserService.getTenantUsers(tenantId),
    enabled: !!tenantId,
  });
};

export const useUpdateTenantUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tenantId, userId, data }: { tenantId: number; userId: number; data: TenantUserUpdate }) =>
      tenantUserService.updateTenantUser(tenantId, userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', variables.tenantId, 'users'] });
    },
  });
};

export const useRemoveUserFromTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: number; userId: number }) =>
      tenantUserService.removeUserFromTenant(tenantId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', variables.tenantId, 'users'] });
    },
  });
};
