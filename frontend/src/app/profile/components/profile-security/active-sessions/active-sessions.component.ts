import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityService } from '../../../../services/security.service';
import { ToastService } from '../../../../services/toast.service';
import { UserSession } from '../../../../models/security.model';

@Component({
    selector: 'app-active-sessions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './active-sessions.component.html',
    styleUrls: ['./active-sessions.component.scss']
})
export class ActiveSessionsComponent {
    @Input() sessions: UserSession[] = [];
    @Input() isLoading = false;
    @Output() sessionRevoked = new EventEmitter<void>();
    @Output() allSessionsRevoked = new EventEmitter<void>();

    isRevoking = false;
    isRevokingAll = false;
    selectedSessionId: number | null = null;

    constructor(
        private securityService: SecurityService,
        private toastService: ToastService
    ) { }

    /**
     * Revoke a specific session
     */
    revokeSession(sessionId: number): void {
        if (this.isRevoking || this.isRevokingAll) {
            return;
        }

        this.isRevoking = true;
        this.selectedSessionId = sessionId;

        this.securityService.revokeSession(sessionId).subscribe({
            next: () => {
                this.toastService.success('Session revoked successfully');
                this.isRevoking = false;
                this.selectedSessionId = null;
                this.sessionRevoked.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to revoke session';
                this.toastService.error(message);
                this.isRevoking = false;
                this.selectedSessionId = null;
            }
        });
    }

    /**
     * Revoke all other sessions
     */
    revokeAllOtherSessions(): void {
        if (this.isRevoking || this.isRevokingAll) {
            return;
        }

        if (!confirm('Are you sure you want to revoke all other sessions? This will log you out from all other devices.')) {
            return;
        }

        this.isRevokingAll = true;

        this.securityService.revokeAllOtherSessions().subscribe({
            next: (response) => {
                const count = response.revoked_count || 0;
                this.toastService.success(`Revoked ${count} other session${count !== 1 ? 's' : ''}`);
                this.isRevokingAll = false;
                this.allSessionsRevoked.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to revoke sessions';
                this.toastService.error(message);
                this.isRevokingAll = false;
            }
        });
    }

    /**
     * Get device icon based on device type
     */
    getDeviceIcon(device: string): string {
        switch (device.toLowerCase()) {
            case 'mobile':
                return 'bi-phone';
            case 'tablet':
                return 'bi-tablet';
            case 'desktop':
            default:
                return 'bi-laptop';
        }
    }

    /**
     * Get browser icon based on browser name
     */
    getBrowserIcon(browser: string): string {
        switch (browser.toLowerCase()) {
            case 'chrome':
                return 'bi-google-chrome';
            case 'firefox':
                return 'bi-mozilla-firefox';
            case 'safari':
                return 'bi-apple';
            case 'edge':
                return 'bi-microsoft-edge';
            default:
                return 'bi-globe';
        }
    }

    /**
     * Get platform icon based on platform name
     */
    getPlatformIcon(platform: string): string {
        switch (platform.toLowerCase()) {
            case 'windows':
                return 'bi-microsoft-windows';
            case 'macos':
                return 'bi-apple';
            case 'linux':
                return 'bi-ubuntu';
            case 'android':
                return 'bi-android';
            case 'ios':
                return 'bi-apple';
            default:
                return 'bi-display';
        }
    }

    /**
     * Get session status text
     */
    getSessionStatusText(session: UserSession): string {
        if (session.is_current) {
            return 'Current Session';
        }
        return 'Active';
    }

    /**
     * Get session status color
     */
    getSessionStatusColor(session: UserSession): string {
        if (session.is_current) {
            return 'success';
        }
        return 'secondary';
    }

    /**
     * Format IP address for display
     */
    formatIpAddress(ip: string): string {
        // Simple IP formatting - you could add more sophisticated logic
        return ip;
    }

    /**
     * Check if session can be revoked
     */
    canRevokeSession(session: UserSession): boolean {
        return !session.is_current && !this.isRevoking && !this.isRevokingAll;
    }

    /**
     * Check if revoke all button should be disabled
     */
    shouldDisableRevokeAll(): boolean {
        const otherSessionsCount = this.sessions.filter(s => !s.is_current).length;
        return this.isRevoking || this.isRevokingAll || otherSessionsCount === 0;
    }
}