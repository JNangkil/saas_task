import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityService } from '../../../../services/security.service';
import { SecurityLogEntry } from '../../../../models/security.model';

@Component({
    selector: 'app-security-log',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './security-log.component.html',
    styleUrls: ['./security-log.component.scss']
})
export class SecurityLogComponent {
    @Input() logs: SecurityLogEntry[] = [];
    @Input() isLoading = false;
    @Output() loadMore = new EventEmitter<void>();

    constructor(
        private securityService: SecurityService
    ) { }

    /**
     * Load more security logs
     */
    onLoadMore(): void {
        this.loadMore.emit();
    }

    /**
     * Get event icon class
     */
    getEventIcon(entry: SecurityLogEntry): string {
        return entry.icon_class;
    }

    /**
     * Get event color class
     */
    getEventColor(entry: SecurityLogEntry): string {
        return entry.color_class;
    }

    /**
     * Get event description with metadata
     */
    getEventDescription(entry: SecurityLogEntry): string {
        let description = entry.description;

        // Add additional context from metadata if available
        if (entry.metadata) {
            if (entry.metadata.revoked_session_ip) {
                description += ` (IP: ${entry.metadata.revoked_session_ip})`;
            }
            if (entry.metadata.revoked_count) {
                description += ` (${entry.metadata.revoked_count} sessions)`;
            }
        }

        return description;
    }

    /**
     * Get formatted event type for display
     */
    getEventType(entry: SecurityLogEntry): string {
        return entry.formatted_event_type;
    }

    /**
     * Get formatted date for display
     */
    getFormattedDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    /**
     * Check if there are more logs to load
     */
    hasMoreLogs(): boolean {
        return this.logs.length >= 50; // Based on our API limit
    }

    /**
     * Get CSS class for log entry based on event type
     */
    getLogEntryClass(entry: SecurityLogEntry): string {
        switch (entry.event_type) {
            case 'login':
                return 'login-event';
            case 'failed_login':
                return 'failed-login-event';
            case 'password_changed':
                return 'password-changed-event';
            case 'mfa_enabled':
                return 'mfa-enabled-event';
            case 'mfa_disabled':
                return 'mfa-disabled-event';
            case 'session_revoked':
                return 'session-revoked-event';
            default:
                return '';
        }
    }
}