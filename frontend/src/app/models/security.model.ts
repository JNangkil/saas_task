/**
 * User session interface
 */
export interface UserSession {
    id: number;
    token_id: number;
    ip_address: string;
    device: string;
    browser: string;
    platform: string;
    last_activity: string;
    formatted_last_activity: string;
    is_current: boolean;
    created_at: string;
}

/**
 * Security log entry interface
 */
export interface SecurityLogEntry {
    id: number;
    event_type: string;
    formatted_event_type: string;
    description: string;
    ip_address: string;
    icon_class: string;
    color_class: string;
    metadata: any;
    created_at: string;
    formatted_created_at: string;
}

/**
 * Backup codes interface
 */
export interface BackupCodes {
    codes_count: number;
    codes?: string[];
}

/**
 * Password change request interface
 */
export interface PasswordChangeRequest {
    current_password: string;
    password: string;
    password_confirmation: string;
}

/**
 * MFA status interface
 */
export interface MfaStatus {
    enabled: boolean;
    setup: boolean;
    recovery_codes_count: number;
}

/**
 * Security settings interface
 */
export interface SecuritySettings {
    mfa: MfaStatus;
    sessions: UserSession[];
    backup_codes: BackupCodes;
}

/**
 * Security log response interface
 */
export interface SecurityLogResponse {
    logs: SecurityLogEntry[];
    count: number;
    limit: number;
    offset: number;
}

/**
 * Sessions response interface
 */
export interface SessionsResponse {
    sessions: UserSession[];
    count: number;
}