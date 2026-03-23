import { createContext } from 'react';
import { AuthModel, UserModel } from '../lib/models';
import { LockoutInfo } from '@/lib/models/mfa.models';

export interface AuthContextValue {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  auth: AuthModel | undefined;
  saveAuth: (auth: AuthModel | undefined) => void;
  user: UserModel | undefined;
  setUser: (user: UserModel | undefined) => void;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  clearMfaState: () => void;
  register: (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (
    password: string,
    password_confirmation: string,
    token?: string,
    email?: string
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
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
