import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { UserProfile, UserUpdate, UserAvatarUpdate } from '@/lib/models/user.model';

/**
 * User API Service
 */
class UserService {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UserUpdate): Promise<UserProfile> {
    const response = await apiClient.patch<UserProfile>('/users/me', data);
    
    // Update stored user data
    const currentUser = localStorage.getItem('auth_user');
    if (currentUser) {
      const updatedUser = { ...JSON.parse(currentUser), ...response.data };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
    
    return response.data;
  }

  /**
   * Update user avatar
   */
  async updateAvatar(data: UserAvatarUpdate): Promise<UserProfile> {
    const formData = new FormData();
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }

    const response = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Update stored user data
    const currentUser = localStorage.getItem('auth_user');
    if (currentUser) {
      const updatedUser = { ...JSON.parse(currentUser), ...response.data };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
    
    return response.data;
  }

  /**
   * Remove user avatar
   */
  async removeAvatar(): Promise<UserProfile> {
    const response = await apiClient.delete<UserProfile>('/users/me/avatar');
    
    // Update stored user data
    const currentUser = localStorage.getItem('auth_user');
    if (currentUser) {
      const updatedUser = { ...JSON.parse(currentUser), ...response.data };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
    
    return response.data;
  }
}

export const userService = new UserService();

/**
 * React Query hooks for user
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: () => userService.getCurrentUser(),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserUpdate) => userService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserAvatarUpdate) => userService.updateAvatar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useRemoveAvatar = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => userService.removeAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
