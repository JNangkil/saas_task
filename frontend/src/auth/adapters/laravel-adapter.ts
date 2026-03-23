import { apiClient } from '@/lib/api';
import { AuthModel, UserModel } from '@/auth/lib/models';
import {
  MfaSetupRequest,
  MfaSetupResponse,
  MfaEnableRequest,
  MfaEnableResponse,
  MfaDisableRequest,
  MfaDisableResponse,
  MfaVerifyRequest,
  MfaVerifyResponse,
  MfaLoginRequest,
  MfaLoginResponse,
  MfaStatus,
  LockoutInfo,
} from '@/lib/models/mfa.models';

/**
 * Laravel Auth Adapter
 * Handles all authentication-related API calls for Laravel backend
 */
export class LaravelAdapter {
  private static readonly MFA_TOKEN_KEY = 'mfa_token';
  private static readonly MFA_EMAIL_KEY = 'mfa_email';
  private static readonly LOCKOUT_STATE_KEY = 'lockout_state';

  /**
   * Login with email and password
   * Returns MFA info if MFA is required, otherwise returns auth tokens
   */
  static async login(email: string, password: string): Promise<MfaLoginResponse | AuthModel> {
    try {
      const response = await apiClient.post<MfaLoginResponse>('/auth/login', {
        email,
        password,
      });

      if ((response.data as MfaLoginResponse).requires_mfa) {
        // Store MFA data temporarily
        const mfaData = response.data as MfaLoginResponse;
        if (mfaData.mfa_token) {
          localStorage.setItem(this.MFA_TOKEN_KEY, mfaData.mfa_token);
          localStorage.setItem(this.MFA_EMAIL_KEY, email);
        }
        return mfaData;
      }

      // Standard login flow
      const authData = response.data as AuthModel;
      const { access_token, refresh_token } = authData;

      // Store tokens in localStorage for the API client
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Get user data
      const user = await this.getCurrentUser();
      if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      }

      return {
        access_token,
        refresh_token,
      };
    } catch (error: any) {
      // Handle account lockout
      if (error.response?.status === 423) {
        const lockoutData = error.response.data;
        localStorage.setItem(this.LOCKOUT_STATE_KEY, JSON.stringify({
          isLocked: true,
          lockedUntil: lockoutData.locked_until,
          retryAfter: lockoutData.retry_after,
          failedAttempts: lockoutData.failed_attempts,
        }));
      }
      throw error;
    }
  }

  /**
   * Verify MFA code during login
   */
  static async verifyMfa(code: string): Promise<AuthModel> {
    const mfaToken = localStorage.getItem(this.MFA_TOKEN_KEY);
    const email = localStorage.getItem(this.MFA_EMAIL_KEY);

    if (!mfaToken || !email) {
      throw new Error('MFA session not found');
    }

    const response = await apiClient.post<MfaVerifyResponse>('/auth/mfa/verify', {
      code,
      email,
      mfa_token: mfaToken,
    });

    // Clear MFA temporary data
    localStorage.removeItem(this.MFA_TOKEN_KEY);
    localStorage.removeItem(this.MFA_EMAIL_KEY);
    localStorage.removeItem(this.LOCKOUT_STATE_KEY);

    // Store user data
    const user = response.data.user;
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
  }

  /**
   * Setup MFA for the user
   */
  static async setupMfa(password: string): Promise<MfaSetupResponse> {
    const response = await apiClient.post<MfaSetupResponse>('/auth/mfa/setup', { password });
    return response.data;
  }

  /**
   * Enable MFA after verification
   */
  static async enableMfa(code: string): Promise<MfaEnableResponse> {
    const response = await apiClient.post<MfaEnableResponse>('/auth/mfa/enable', { code });
    return response.data;
  }

  /**
   * Disable MFA
   */
  static async disableMfa(password: string): Promise<MfaDisableResponse> {
    const response = await apiClient.post<MfaDisableResponse>('/auth/mfa/disable', { password });
    return response.data;
  }

  /**
   * Get MFA status for the current user
   */
  static async getMfaStatus(): Promise<MfaStatus> {
    const response = await apiClient.get<MfaStatus>('/auth/mfa/status');
    return response.data;
  }

  /**
   * Register a new user account
   */
  static async register(
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/register', {
      email,
      password,
      password_confirmation,
      name: firstName ? `${firstName} ${lastName || ''}`.trim() : email.split('@')[0],
    });
    return response.data;
  }

  /**
   * Request a password reset email
   */
  static async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/password/forgot', { email });
    return response.data;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    password: string,
    password_confirmation: string,
    token: string,
    email: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/password/reset', {
      password,
      password_confirmation,
      token,
      email,
    });
    return response.data;
  }

  /**
   * Verify if a reset token is valid
   */
  static async verifyResetToken(email: string, token: string): Promise<{ valid: boolean; message?: string }> {
    const response = await apiClient.get<{ valid: boolean; message?: string }>('/auth/password/verify', {
      params: { email, token },
    });
    return response.data;
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/email/resend', { email });
    return response.data;
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<UserModel | null> {
    try {
      const response = await apiClient.get<UserModel>('/me');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userData: Partial<UserModel>): Promise<UserModel> {
    const response = await apiClient.put<UserModel>('/me', userData);

    // Update stored user data
    const currentUser = localStorage.getItem('auth_user');
    if (currentUser) {
      const updatedUser = { ...JSON.parse(currentUser), ...response.data };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }

    return response.data;
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      // Ignore errors during logout
    } finally {
      // Always clear local data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem(this.MFA_TOKEN_KEY);
      localStorage.removeItem(this.MFA_EMAIL_KEY);
      localStorage.removeItem(this.LOCKOUT_STATE_KEY);
    }
  }

  /**
   * Get MFA state from localStorage
   */
  static getMfaState(): { requiresMfa: boolean; email?: string } {
    const mfaToken = localStorage.getItem(this.MFA_TOKEN_KEY);
    const email = localStorage.getItem(this.MFA_EMAIL_KEY);

    return {
      requiresMfa: !!mfaToken,
      email: email || undefined,
    };
  }

  /**
   * Get lockout information
   */
  static getLockoutInfo(): LockoutInfo {
    const lockoutState = localStorage.getItem(this.LOCKOUT_STATE_KEY);
    if (!lockoutState) {
      return { isLocked: false };
    }

    try {
      const state = JSON.parse(lockoutState);
      
      // Check if lockout has expired
      if (state.isLocked && state.lockedUntil) {
        const lockedUntil = new Date(state.lockedUntil);
        if (lockedUntil <= new Date()) {
          // Lockout has expired, clear it
          this.clearLockoutState();
          return { isLocked: false };
        }
      }

      return {
        isLocked: state.isLocked,
        lockedUntil: state.lockedUntil ? new Date(state.lockedUntil) : undefined,
        retryAfter: state.retryAfter,
        failedAttempts: state.failedAttempts,
      };
    } catch (error) {
      return { isLocked: false };
    }
  }

  /**
   * Clear lockout state
   */
  static clearLockoutState(): void {
    localStorage.removeItem(this.LOCKOUT_STATE_KEY);
  }

  /**
   * Check if account is currently locked
   */
  static isAccountLocked(): boolean {
    const info = this.getLockoutInfo();
    return info.isLocked || false;
  }

  /**
   * Get remaining lockout time in seconds
   */
  static getRemainingLockoutTime(): number {
    const info = this.getLockoutInfo();
    if (!info.isLocked || !info.lockedUntil) {
      return 0;
    }

    const now = new Date();
    const remainingMs = info.lockedUntil.getTime() - now.getTime();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }
}
