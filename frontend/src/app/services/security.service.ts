import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
    PasswordChangeRequest,
    UserSession,
    SecurityLogEntry,
    BackupCodes,
    SecurityLogResponse,
    SessionsResponse,
    MfaStatus
} from '../models/security.model';

/**
 * Security service for managing user security settings
 */
@Injectable({
    providedIn: 'root'
})
export class SecurityService {
    constructor(private apiService: ApiService) { }

    /**
     * Change user password
     *
     * @param data Password change data
     * @returns Observable<any> Success response
     */
    changePassword(data: PasswordChangeRequest): Observable<any> {
        return this.apiService.post('auth/security/change-password', data);
    }

    /**
     * Get active sessions for the user
     *
     * @returns Observable<SessionsResponse> User sessions
     */
    getActiveSessions(): Observable<SessionsResponse> {
        return this.apiService.get<SessionsResponse>('auth/security/sessions');
    }

    /**
     * Revoke a specific session
     *
     * @param sessionId Session ID to revoke
     * @returns Observable<any> Success response
     */
    revokeSession(sessionId: number): Observable<any> {
        return this.apiService.delete(`auth/security/sessions/${sessionId}`);
    }

    /**
     * Revoke all other sessions except current one
     *
     * @returns Observable<any> Success response with revoked count
     */
    revokeAllOtherSessions(): Observable<any> {
        return this.apiService.post('auth/security/sessions/revoke-others', {});
    }

    /**
     * Get security log for the user
     *
     * @param limit Maximum number of entries to return
     * @param offset Number of entries to skip
     * @returns Observable<SecurityLogResponse> Security log entries
     */
    getSecurityLog(limit: number = 50, offset: number = 0): Observable<SecurityLogResponse> {
        return this.apiService.get<SecurityLogResponse>(`auth/security/log?limit=${limit}&offset=${offset}`);
    }

    /**
     * Get backup codes for the user
     *
     * @returns Observable<BackupCodes> Backup codes information
     */
    getBackupCodes(): Observable<BackupCodes> {
        return this.apiService.get<BackupCodes>('auth/security/backup-codes');
    }

    /**
     * Regenerate backup codes for the user
     *
     * @returns Observable<BackupCodes> New backup codes
     */
    regenerateBackupCodes(): Observable<BackupCodes> {
        return this.apiService.post<BackupCodes>('auth/security/backup-codes/regenerate', {});
    }

    /**
     * Get MFA status for the user
     *
     * @returns Observable<MfaStatus> MFA status information
     */
    getMfaStatus(): Observable<MfaStatus> {
        return this.apiService.get<MfaStatus>('auth/mfa/status');
    }

    /**
     * Setup MFA for the user
     *
     * @returns Observable<any> MFA setup data with secret and QR code
     */
    setupMfa(): Observable<any> {
        return this.apiService.post('auth/mfa/setup', {});
    }

    /**
     * Enable MFA after verification
     *
     * @param code TOTP verification code
     * @returns Observable<any> Success response
     */
    enableMfa(code: string): Observable<any> {
        return this.apiService.post('auth/mfa/enable', { code });
    }

    /**
     * Disable MFA for the user
     *
     * @returns Observable<any> Success response
     */
    disableMfa(): Observable<any> {
        return this.apiService.post('auth/mfa/disable', {});
    }

    /**
     * Verify TOTP code
     *
     * @param code TOTP verification code
     * @returns Observable<any> Verification response
     */
    verifyMfaCode(code: string): Observable<any> {
        return this.apiService.post('auth/mfa/verify', { code });
    }
}