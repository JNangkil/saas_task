import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Notification, NotificationsPaginatedResponse } from '@/lib/models/user.model';

/**
 * Notification API Service
 */
class NotificationService {
  private unreadCountKey = ['notifications', 'unread-count'];
  
  /**
   * Get notifications with pagination
   */
  async getNotifications(page: number = 1, unreadOnly: boolean = false): Promise<NotificationsPaginatedResponse> {
    const response = await apiClient.get<NotificationsPaginatedResponse>('/notifications', {
      params: {
        page,
        unread_only: unreadOnly,
      },
    });
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }
}

export const notificationService = new NotificationService();

/**
 * React Query hooks for notifications
 */
export const useNotifications = (page: number = 1, unreadOnly: boolean = false) => {
  return useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationService.getNotifications(page, unreadOnly),
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: notificationService['unreadCountKey'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: notificationService['unreadCountKey'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: notificationService['unreadCountKey'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
