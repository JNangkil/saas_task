import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityService } from '../../../../services/security.service';
import { ToastService } from '../../../../services/toast.service';
import { BackupCodes } from '../../../../models/security.model';

@Component({
    selector: 'app-backup-codes',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './backup-codes.component.html',
    styleUrls: ['./backup-codes.component.scss']
})
export class BackupCodesComponent {
    @Input() backupCodes: BackupCodes | null = null;
    @Input() isLoading = false;
    @Output() codesRegenerated = new EventEmitter<void>();

    isRegenerating = false;
    showCodesModal = false;
    showHelpModal = false;
    newBackupCodes: string[] = [];

    constructor(
        private securityService: SecurityService,
        private toastService: ToastService
    ) { }

    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(): void {
        if (this.isRegenerating) {
            return;
        }

        if (!confirm('Are you sure you want to regenerate backup codes? This will invalidate your existing codes.')) {
            return;
        }

        this.isRegenerating = true;
        this.securityService.regenerateBackupCodes().subscribe({
            next: (response) => {
                this.newBackupCodes = response.codes || [];
                this.showCodesModal = true;
                this.isRegenerating = false;
                this.codesRegenerated.emit();
                this.toastService.success('Backup codes regenerated successfully');
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to regenerate backup codes';
                this.toastService.error(message);
                this.isRegenerating = false;
            }
        });
    }

    /**
     * Close backup codes modal
     */
    closeBackupCodesModal(): void {
        this.showCodesModal = false;
        this.newBackupCodes = [];
    }

    /**
     * Download backup codes
     */
    downloadBackupCodes(): void {
        if (this.newBackupCodes.length === 0) {
            this.toastService.warning('No backup codes to download');
            return;
        }

        let content = 'Backup Codes for ' + (new Date().toLocaleDateString()) + '\n\n';
        this.newBackupCodes.forEach((code, index) => {
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

    /**
     * Copy code to clipboard
     */
    copyToClipboard(code: string): void {
        navigator.clipboard.writeText(code).then(() => {
            this.toastService.success('Code copied to clipboard');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.toastService.success('Code copied to clipboard');
        });
    }

    /**
     * Get backup codes status text
     */
    getBackupCodesStatusText(): string {
        if (!this.backupCodes) {
            return 'Loading...';
        }

        const count = this.backupCodes.codes_count;

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
        if (!this.backupCodes) {
            return 'text-muted';
        }

        const count = this.backupCodes.codes_count;

        if (count === 0) {
            return 'text-danger';
        }

        if (count < 5) {
            return 'text-warning';
        }

        return 'text-success';
    }

    /**
     * Check if regenerate button should be disabled
     */
    shouldDisableRegenerate(): boolean {
        return this.isRegenerating || this.isLoading;
    }

    /**
     * Check if download button should be disabled
     */
    shouldDisableDownload(): boolean {
        return this.newBackupCodes.length === 0;
    }

    /**
     * Open help modal
     */
    openHelpModal(): void {
        this.showHelpModal = true;
    }

    /**
     * Close help modal
     */
    closeHelpModal(): void {
        this.showHelpModal = false;
    }
}