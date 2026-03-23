export interface AccountLockoutResponse {
    error: string;
    message: string;
    locked_until: string;
    retry_after: number;
    failed_attempts?: number;
}

export interface InvalidCredentialsResponse {
    error: string;
    message: string;
    failed_attempts?: number;
    remaining_attempts?: number;
}

export interface LockoutState {
    isLocked: boolean;
    lockedUntil?: string;
    retryAfter?: number;
    failedAttempts?: number;
    remainingAttempts?: number;
}

export interface LockoutInfo {
    isLocked: boolean;
    lockedUntil?: Date;
    retryAfter?: number;
    failedAttempts?: number;
    remainingAttempts?: number;
    message?: string;
}