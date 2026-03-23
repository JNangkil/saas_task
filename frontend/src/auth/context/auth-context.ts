import { createContext, useContext } from 'react';
import { AuthModel, UserModel } from '@/auth/lib/models';
import { LockoutInfo } from '@/lib/models/mfa.models';

// Create AuthContext with types
export const AuthContext = createContext<{
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  auth?: AuthModel;
  saveAuth: (auth: AuthModel | undefined) => void;
  user?: UserModel;
  setUser: React.Dispatch<React.SetStateAction<UserModel | undefined>>;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  clearMfaState: () => void;
  register: (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (
    password: string,
    password_confirmation: string,
    token?: string,
    email?: string,
  ) => Promise<void>;
  verifyResetToken: (email: string, token: string) => Promise<{ valid: boolean; message?: string }>;
  resendVerificationEmail: (email: string) => Promise<void>;
  getUser: () => Promise<UserModel | null>;
  updateProfile: (userData: Partial<UserModel>) => Promise<UserModel>;
  logout: () => Promise<void>;
  verify: () => Promise<void>;
  isAdmin: boolean;
  requiresMfa: boolean;
  mfaEmail?: string;
  lockoutInfo: LockoutInfo;
  refreshLockoutState: () => LockoutInfo;
}>({
  loading: false,
  setLoading: () => {},
  saveAuth: () => {},
  setUser: () => {},
  login: async () => ({ requiresMfa: false }),
  verifyMfa: async () => {},
  clearMfaState: () => {},
  register: async () => {},
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  verifyResetToken: async () => ({ valid: false }),
  resendVerificationEmail: async () => {},
  getUser: async () => null,
  updateProfile: async () => ({}) as UserModel,
  logout: async () => {},
  verify: async () => {},
  isAdmin: false,
  requiresMfa: false,
  mfaEmail: undefined,
  lockoutInfo: { isLocked: false },
  refreshLockoutState: () => ({ isLocked: false }),
});

// Hook definition
export function useAuth() {
  return useContext(AuthContext);
}
