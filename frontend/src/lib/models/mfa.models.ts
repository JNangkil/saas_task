/**
 * MFA Setup Request
 */
export interface MfaSetupRequest {
  password: string;
}

/**
 * MFA Setup Response
 */
export interface MfaSetupResponse {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

/**
 * MFA Enable Request
 */
export interface MfaEnableRequest {
  code: string;
}

/**
 * MFA Enable Response
 */
export interface MfaEnableResponse {
  message: string;
  enabled: boolean;
}

/**
 * MFA Disable Request
 */
export interface MfaDisableRequest {
  password: string;
}

/**
 * MFA Disable Response
 */
export interface MfaDisableResponse {
  message: string;
  disabled: boolean;
}

/**
 * MFA Verify Request (during login)
 */
export interface MfaVerifyRequest {
  code: string;
}

/**
 * MFA Verify Response (during login)
 */
export interface MfaVerifyResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    is_super_admin?: boolean;
  };
  tenant?: {
    id: number;
  } | null;
  tenants?: any[];
}

/**
 * MFA Login Request (first step)
 */
export interface MfaLoginRequest {
  email: string;
  password: string;
}

/**
 * MFA Login Response (first step)
 */
export interface MfaLoginResponse {
  requires_mfa: boolean;
  mfa_token?: string;
}

/**
 * MFA Status
 */
export interface MfaStatus {
  enabled: boolean;
  secret?: string;
}

/**
 * Account Lockout Response
 */
export interface AccountLockoutResponse {
  message: string;
  locked_until: string;
  retry_after: number;
  failed_attempts: number;
}

/**
 * Invalid Credentials Response
 */
export interface InvalidCredentialsResponse {
  message: string;
  failed_attempts: number;
  remaining_attempts: number;
}

/**
 * Lockout State
 */
export interface LockoutState {
  isLocked: boolean;
  lockedUntil?: string;
  retryAfter?: number;
  failedAttempts?: number;
  remainingAttempts?: number;
}

/**
 * Lockout Information
 */
export interface LockoutInfo {
  isLocked: boolean;
  lockedUntil?: Date;
  retryAfter?: number;
  failedAttempts?: number;
  remainingAttempts?: number;
}
