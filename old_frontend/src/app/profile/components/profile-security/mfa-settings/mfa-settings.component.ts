import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SecurityService } from '../../../../services/security.service';
import { ToastService } from '../../../../services/toast.service';
import { MfaStatus } from '../../../../models/security.model';

@Component({
    selector: 'app-mfa-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './mfa-settings.component.html',
    styleUrls: ['./mfa-settings.component.scss']
})
export class MfaSettingsComponent {
    @Input() mfaStatus: MfaStatus | null = null;
    @Input() isLoading = false;
    @Output() statusChanged = new EventEmitter<void>();

    isEnabling = false;
    isDisabling = false;
    isSettingUp = false;
    showSetupModal = false;
    showDisableModal = false;
    setupData: any = null;
    verificationCode = '';
    disablePassword = '';

    constructor(
        private securityService: SecurityService,
        private toastService: ToastService
    ) { }

    /**
     * Open MFA setup modal
     */
    openSetupModal(): void {
        this.isSettingUp = true;
        this.securityService.setupMfa().subscribe({
            next: (data: any) => {
                this.setupData = data;
                this.showSetupModal = true;
                this.isSettingUp = false;
            },
            error: (error: any) => {
                this.toastService.error('Failed to setup MFA: ' + (error.error?.message || error.message));
                this.isSettingUp = false;
            }
        });
    }

    /**
     * Enable MFA after verification
     */
    enableMfa(): void {
        if (!this.verificationCode || this.verificationCode.length !== 6) {
            this.toastService.error('Please enter a valid 6-digit verification code');
            return;
        }

        this.isEnabling = true;
        this.securityService.enableMfa(this.verificationCode).subscribe({
            next: () => {
                this.toastService.success('MFA enabled successfully');
                this.showSetupModal = false;
                this.verificationCode = '';
                this.setupData = null;
                this.isEnabling = false;
                this.statusChanged.emit();
            },
            error: (error: any) => {
                const message = error.error?.message || 'Failed to enable MFA';
                this.toastService.error(message);
                this.isEnabling = false;
            }
        });
    }

    /**
     * Open MFA disable modal
     */
    openDisableModal(): void {
        this.showDisableModal = true;
    }

    /**
     * Disable MFA
     */
    disableMfa(): void {
        this.isDisabling = true;
        this.securityService.disableMfa().subscribe({
            next: () => {
                this.toastService.success('MFA disabled successfully');
                this.showDisableModal = false;
                this.disablePassword = '';
                this.isDisabling = false;
                this.statusChanged.emit();
            },
            error: (error: any) => {
                const message = error.error?.message || 'Failed to disable MFA';
                this.toastService.error(message);
                this.isDisabling = false;
            }
        });
    }

    /**
     * Close setup modal
     */
    closeSetupModal(): void {
        this.showSetupModal = false;
        this.verificationCode = '';
        this.setupData = null;
    }

    /**
     * Close disable modal
     */
    closeDisableModal(): void {
        this.showDisableModal = false;
        this.disablePassword = '';
    }

    /**
     * Get MFA status text
     */
    getMfaStatusText(): string {
        if (!this.mfaStatus) {
            return 'Loading...';
        }

        if (this.mfaStatus.enabled) {
            return 'Enabled';
        }

        if (this.mfaStatus.setup) {
            return 'Setup Incomplete';
        }

        return 'Not Enabled';
    }

    /**
     * Get MFA status color
     */
    getMfaStatusColor(): string {
        if (!this.mfaStatus) {
            return 'text-muted';
        }

        if (this.mfaStatus.enabled) {
            return 'text-success';
        }

        if (this.mfaStatus.setup) {
            return 'text-warning';
        }

        return 'text-danger';
    }

    /**
     * Get MFA status icon
     */
    getMfaStatusIcon(): string {
        if (!this.mfaStatus) {
            return 'bi-hourglass-split';
        }

        if (this.mfaStatus.enabled) {
            return 'bi-shield-check';
        }

        if (this.mfaStatus.setup) {
            return 'bi-shield-exclamation';
        }

        return 'bi-shield-x';
    }

    /**
     * Get backup codes status text
     */
    getBackupCodesStatusText(): string {
        if (!this.mfaStatus) {
            return 'Loading...';
        }

        const count = this.mfaStatus.recovery_codes_count;

        if (count === 0) {
            return 'No backup codes available';
        }

        if (count < 5) {
            return `Only ${count} backup codes remaining`;
        }

        return `${count} backup codes available`;
    }

    /**
     * Get backup codes status color
     */
    getBackupCodesStatusColor(): string {
        if (!this.mfaStatus) {
            return 'text-muted';
        }

        const count = this.mfaStatus.recovery_codes_count;

        if (count === 0) {
            return 'text-danger';
        }

        if (count < 5) {
            return 'text-warning';
        }

        return 'text-success';
    }

    /**
     * Copy text to clipboard
     */
    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.toastService.success('Copied to clipboard');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.toastService.success('Copied to clipboard');
        });
    }

    /**
     * Download backup codes as text file
     */
    downloadBackupCodes(codes: string[]): void {
        let content = 'Backup Codes for ' + (new Date().toLocaleDateString()) + '\n\n';
        codes.forEach((code, index) => {
            content += `${index + 1}. ${code}\n`;
        });
        content += '\nKeep these codes safe. Each code can only be used once.';

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.toastService.success('Backup codes downloaded');
    }
}