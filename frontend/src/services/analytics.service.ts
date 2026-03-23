import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardStats, WorkspaceSummary, BoardSummary, UserProductivity, ActivityTrend, AnalyticsFilters } from '@/lib/models/analytics.model';

/**
 * Analytics API Service
 */
class AnalyticsService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(filters?: AnalyticsFilters): Promise<DashboardStats> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const response = await apiClient.get<DashboardStats>(`/analytics/dashboard${params ? `?${params}` : ''}`);
    return response.data;
  }

  /**
   * Get workspace summary
   */
  async getWorkspaceSummary(workspaceId: number, filters?: AnalyticsFilters): Promise<WorkspaceSummary> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const response = await apiClient.get<WorkspaceSummary>(
      `/analytics/workspaces/${workspaceId}${params ? `?${params}` : ''}`
    );
    return response.data;
  }

  /**
   * Get board summary
   */
  async getBoardSummary(boardId: number, filters?: AnalyticsFilters): Promise<BoardSummary> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const response = await apiClient.get<BoardSummary>(
      `/analytics/boards/${boardId}${params ? `?${params}` : ''}`
    );
    return response.data;
  }

  /**
   * Get user productivity stats
   */
  async getUserProductivity(workspaceId: number, filters?: AnalyticsFilters): Promise<UserProductivity[]> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const response = await apiClient.get<UserProductivity[]>(
      `/analytics/workspaces/${workspaceId}/productivity${params ? `?${params}` : ''}`
    );
    return response.data;
  }

  /**
   * Get activity trends
   */
  async getActivityTrends(workspaceId: number, filters?: AnalyticsFilters): Promise<ActivityTrend[]> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const response = await apiClient.get<ActivityTrend[]>(
      `/analytics/workspaces/${workspaceId}/trends${params ? `?${params}` : ''}`
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();

/**
 * React Query hooks for analytics
 */
export const useDashboardStats = (filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'dashboard', filters],
    queryFn: () => analyticsService.getDashboardStats(filters),
  });
};

export const useWorkspaceSummary = (workspaceId: number, filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'workspace', workspaceId, filters],
    queryFn: () => analyticsService.getWorkspaceSummary(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

export const useBoardSummary = (boardId: number, filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'board', boardId, filters],
    queryFn: () => analyticsService.getBoardSummary(boardId, filters),
    enabled: !!boardId,
  });
};

export const useUserProductivity = (workspaceId: number, filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'workspace', workspaceId, 'productivity', filters],
    queryFn: () => analyticsService.getUserProductivity(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

export const useActivityTrends = (workspaceId: number, filters?: AnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'workspace', workspaceId, 'trends', filters],
    queryFn: () => analyticsService.getActivityTrends(workspaceId, filters),
    enabled: !!workspaceId,
  });
};
