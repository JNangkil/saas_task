import { PropsWithChildren, useEffect, useState } from 'react';
import { LaravelAdapter } from '@/auth/adapters/laravel-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';
import { LockoutInfo } from '@/lib/models/mfa.models';

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // MFA State
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaEmail, setMfaEmail] = useState<string | undefined>();
  
  // Lockout State
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo>({ isLocked: false });

  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  useEffect(() => {
    // Initialize MFA state from localStorage
    const mfaState = LaravelAdapter.getMfaState();
    setRequiresMfa(mfaState.requiresMfa);
    setMfaEmail(mfaState.email);

    // Initialize lockout state
    const lockout = LaravelAdapter.getLockoutInfo();
    setLockoutInfo(lockout);

    // Clear expired lockout
    if (lockout.isLocked && lockout.lockedUntil) {
      const now = new Date();
      if (lockout.lockedUntil <= now) {
        LaravelAdapter.clearLockoutState();
        setLockoutInfo({ isLocked: false });
      }
    }

    // Restore tokens from stored auth for API client
    const storedAuth = authHelper.getAuth();
    if (storedAuth?.access_token) {
      localStorage.setItem('auth_token', storedAuth.access_token);
    }
    if (storedAuth?.refresh_token) {
      localStorage.setItem('refresh_token', storedAuth.refresh_token);
    }
  }, []);

  const verify = async () => {
    if (auth) {
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        saveAuth(undefined);
        setCurrentUser(undefined);
      }
    }
    setLoading(false);
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
      // Store tokens for API client
      localStorage.setItem('auth_token', auth.access_token);
      localStorage.setItem('refresh_token', auth.refresh_token);
    } else {
      authHelper.removeAuth();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await LaravelAdapter.login(email, password);

      // Check if MFA is required
      if ('requires_mfa' in response && response.requires_mfa) {
        setRequiresMfa(true);
        setMfaEmail(email);
        // Return MFA requirement to caller
        return { requiresMfa: true };
      }

      // Standard login flow
      saveAuth(response as AuthModel);
      const user = await getUser();
      setCurrentUser(user || undefined);
      return { requiresMfa: false };
    } catch (error: any) {
      // Update lockout state if present
      const lockout = LaravelAdapter.getLockoutInfo();
      setLockoutInfo(lockout);
      saveAuth(undefined);
      throw error;
    }
  };

  const verifyMfa = async (code: string) => {
    try {
      const auth = await LaravelAdapter.verifyMfa(code);
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
      setRequiresMfa(false);
      setMfaEmail(undefined);
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      await LaravelAdapter.register(
        email,
        password,
        password_confirmation,
        firstName,
        lastName,
      );
      // For Laravel, registration might require email verification
      // User will need to login separately after verification
    } catch (error) {
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    await LaravelAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
    token?: string,
    email?: string,
  ) => {
    await LaravelAdapter.resetPassword(password, password_confirmation, token || '', email || '');
  };

  const verifyResetToken = async (email: string, token: string) => {
    return await LaravelAdapter.verifyResetToken(email, token);
  };

  const resendVerificationEmail = async (email: string) => {
    await LaravelAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    return await LaravelAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    const updatedUser = await LaravelAdapter.updateUserProfile(userData);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const logout = async () => {
    await LaravelAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
    setRequiresMfa(false);
    setMfaEmail(undefined);
    setLockoutInfo({ isLocked: false });
  };

  const clearMfaState = () => {
    setRequiresMfa(false);
    setMfaEmail(undefined);
  };

  const refreshLockoutState = () => {
    const lockout = LaravelAdapter.getLockoutInfo();
    setLockoutInfo(lockout);
    return lockout;
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        verifyMfa,
        clearMfaState,
        register,
        requestPasswordReset,
        resetPassword,
        verifyResetToken,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
        requiresMfa,
        mfaEmail,
        lockoutInfo,
        refreshLockoutState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
