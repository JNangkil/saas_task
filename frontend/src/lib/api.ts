import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Don't add auth token to login endpoint
        const isAuthEndpoint = config.url?.includes('/auth/login') ||
                              config.url?.includes('/auth/register') ||
                              config.url?.includes('/auth/password');

        if (!isAuthEndpoint) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          // Add tenant ID header if available
          // First try to get from user object
          const userStr = localStorage.getItem('auth_user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              if (user.current_tenant_id) {
                config.headers['X-Tenant-ID'] = user.current_tenant_id;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }

          // If not found in user object, try direct storage
          if (!config.headers['X-Tenant-ID']) {
            const tenantId = localStorage.getItem('current_tenant_id');
            if (tenantId) {
              config.headers['X-Tenant-ID'] = tenantId;
            }
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.client.post('/refresh', {
                refresh_token: refreshToken,
              });

              const { access_token, refresh_token: newRefreshToken } = response.data;

              localStorage.setItem('auth_token', access_token);
              localStorage.setItem('refresh_token', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
