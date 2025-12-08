import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, Label, User } from '../../models';

/**
 * TaskRowComponent - Individual task row for the task table
 * 
 * This component represents a single row in the task table with:
 * - Task data display
 * - Selection functionality
 * - Click and double-click events
 * - Status and priority badges
 * - Assignee information
 * - Due date formatting
 * - Labels display
 */
@Component({
    selector: 'app-task-row',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './task-row.component.html',
    styleUrls: ['./task-row.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskRowComponent {
    // Inputs
    @Input() task!: Task;
    @Input() selected = false;
    @Input() selectable = true;
    @Input() showCheckbox = true;

    // Outputs
    @Output() taskClick = new EventEmitter<Task>();
    @Output() taskDoubleClick = new EventEmitter<Task>();
    @Output() selectionChange = new EventEmitter<{ task: Task; selected: boolean }>();

    // Host bindings for row styling
    @HostBinding('class.selected') get selectedClass() {
        return this.selected;
    }

    @HostBinding('class.clickable') get clickableClass() {
        return true;
    }

    /**
     * Handle row click
     */
    onRowClick(event: MouseEvent): void {
        // Prevent selection toggle when clicking on interactive elements
        if ((event.target as HTMLElement).closest('button, a, input, select')) {
            return;
        }

        this.taskClick.emit(this.task);
    }

    /**
     * Handle row double click
     */
    onRowDoubleClick(): void {
        this.taskDoubleClick.emit(this.task);
    }

    /**
     * Handle checkbox change
     */
    onCheckboxChange(event: Event): void {
        const isChecked = (event.target as HTMLInputElement).checked;
        this.selectionChange.emit({ task: this.task, selected: isChecked });
        event.stopPropagation();
    }

    /**
     * Get status badge class
     */
    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'todo':
                return 'status-todo';
            case 'in_progress':
                return 'status-in-progress';
            case 'completed':
                return 'status-completed';
            case 'cancelled':
                return 'status-cancelled';
            default:
                return 'status-default';
        }
    }

    /**
     * Get priority badge class
     */
    getPriorityBadgeClass(priority: string): string {
        switch (priority) {
            case 'low':
                return 'priority-low';
            case 'medium':
                return 'priority-medium';
            case 'high':
                return 'priority-high';
            case 'urgent':
                return 'priority-urgent';
            default:
                return 'priority-default';
        }
    }

    /**
     * Format status for display
     */
    formatStatus(status: string): string {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format priority for display
     */
    formatPriority(priority: string): string {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    }

    /**
     * Format date for display
     */
    formatDate(dateString?: string): string {
        if (!dateString) return '';

        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    /**
     * Check if date is overdue
     */
    isOverdue(dateString?: string): boolean {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    }

    /**
     * Get user initials for avatar
     */
    getUserInitials(user?: User): string {
        if (!user?.name) return '?';
        return user.name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    /**
     * Get avatar color based on email
     */
    getAvatarColor(email?: string): string {
        if (!email) return '#64748b';

        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
            '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4'
        ];
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Get visible labels (limit to 3 for display)
     */
    getVisibleLabels(): Label[] {
        return this.task.labels?.slice(0, 3) || [];
    }

    /**
     * Get count of hidden labels
     */
    getHiddenLabelsCount(): number {
        return Math.max(0, (this.task.labels?.length || 0) - 3);
    }
}