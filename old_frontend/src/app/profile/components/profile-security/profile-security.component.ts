import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService } from '../../../services/security.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { MfaStatus, UserSession, SecurityLogEntry, BackupCodes } from '../../../models/security.model';
import { PasswordChangeComponent } from './password-change/password-change.component';
import { MfaSettingsComponent } from './mfa-settings/mfa-settings.component';
import { ActiveSessionsComponent } from './active-sessions/active-sessions.component';
import { SecurityLogComponent } from './security-log/security-log.component';
import { BackupCodesComponent } from './backup-codes/backup-codes.component';
import { ProfileBasicComponent } from '../profile-basic/profile-basic.component';

@Component({
    selector: 'app-profile-security',
    standalone: true,
    imports: [
        CommonModule,
        PasswordChangeComponent,
        MfaSettingsComponent,
        ActiveSessionsComponent,
        SecurityLogComponent,
        BackupCodesComponent,
        ProfileBasicComponent
    ],
    templateUrl: './profile-security.component.html',
    styleUrls: ['./profile-security.component.scss']
})
export class ProfileSecurityComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    activeTab: 'profile' | 'security' = 'profile';

    // User data
    user: any = null;
    isLoadingUser = false;

    // Security data
    mfaStatus: MfaStatus | null = null;
    sessions: UserSession[] = [];
    securityLogs: SecurityLogEntry[] = [];
    backupCodes: BackupCodes | null = null;

    // Loading states
    isLoadingMfa = false;
    isLoadingSessions = false;
    isLoadingLogs = false;
    isLoadingBackupCodes = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private securityService: SecurityService,
        private userService: UserService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        // Load user data
        this.loadUserData();

        // Check for tab query parameter
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            if (params['tab'] === 'security') {
                this.activeTab = 'security';
                this.loadSecurityData();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Switch between tabs
     */
    switchTab(tab: 'profile' | 'security'): void {
        this.activeTab = tab;

        // Update URL query parameter
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: tab === 'profile' ? null : 'security' },
            queryParamsHandling: 'merge'
        });

        // Load security data when switching to security tab
        if (tab === 'security') {
            this.loadSecurityData();
        }
    }

    /**
     * Load user data
     */
    private loadUserData(): void {
        this.isLoadingUser = true;
        this.userService.getCurrentUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (user) => {
                    this.user = user;
                    this.isLoadingUser = false;
                },
                error: (error) => {
                    this.toastService.error('Failed to load user data: ' + error.message);
                    this.isLoadingUser = false;
                }
            });
    }

    /**
     * Load all security data
     */
    private loadSecurityData(): void {
        this.loadMfaStatus();
        this.loadSessions();
        this.loadSecurityLogs();
        this.loadBackupCodes();
    }

    /**
     * Load MFA status
     */
    loadMfaStatus(): void {
        this.isLoadingMfa = true;
        this.securityService.getMfaStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (status) => {
                    this.mfaStatus = status;
                    this.isLoadingMfa = false;
                },
                error: (error) => {
                    this.toastService.error('Failed to load MFA status: ' + error.message);
                    this.isLoadingMfa = false;
                }
            });
    }

    /**
     * Load active sessions
     */
    loadSessions(): void {
        this.isLoadingSessions = true;
        this.securityService.getActiveSessions()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.sessions = response.sessions;
                    this.isLoadingSessions = false;
                },
                error: (error) => {
                    this.toastService.error('Failed to load sessions: ' + error.message);
                    this.isLoadingSessions = false;
                }
            });
    }

    /**
     * Load security logs
     */
    loadSecurityLogs(): void {
        this.isLoadingLogs = true;
        this.securityService.getSecurityLog()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.securityLogs = response.logs;
                    this.isLoadingLogs = false;
                },
                error: (error) => {
                    this.toastService.error('Failed to load security logs: ' + error.message);
                    this.isLoadingLogs = false;
                }
            });
    }

    /**
     * Load backup codes
     */
    loadBackupCodes(): void {
        this.isLoadingBackupCodes = true;
        this.securityService.getBackupCodes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (codes) => {
                    this.backupCodes = codes;
                    this.isLoadingBackupCodes = false;
                },
                error: (error) => {
                    this.toastService.error('Failed to load backup codes: ' + error.message);
                    this.isLoadingBackupCodes = false;
                }
            });
    }

    /**
     * Refresh security data
     */
    refreshSecurityData(): void {
        this.loadSecurityData();
        this.toastService.success('Security data refreshed');
    }

    /**
     * Handle MFA status change
     */
    onMfaStatusChanged(): void {
        this.loadMfaStatus();
        this.loadBackupCodes(); // Backup codes count may change
    }

    /**
     * Handle session revocation
     */
    onSessionRevoked(): void {
        this.loadSessions();
        this.toastService.success('Session revoked successfully');
    }

    /**
     * Handle all sessions revoked
     */
    onAllSessionsRevoked(): void {
        this.loadSessions();
        this.toastService.success('All other sessions revoked');
    }

    /**
     * Handle backup codes regeneration
     */
    onBackupCodesRegenerated(): void {
        this.loadBackupCodes();
        this.toastService.success('Backup codes regenerated');
    }

    /**
     * Handle profile update
     */
    onProfileUpdated(): void {
        this.loadUserData();
        this.toastService.success('Profile updated successfully');
    }
}