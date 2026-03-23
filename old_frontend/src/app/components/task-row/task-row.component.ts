import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Task, Label, User, TaskUpdate } from '../../models';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';

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
    imports: [CommonModule, FormsModule],
    templateUrl: './task-row.component.html',
    styleUrls: ['./task-row.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskRowComponent implements OnInit, OnDestroy {
    // Inputs
    @Input() task!: Task;
    @Input() selected = false;
    @Input() selectable = true;
    @Input() showCheckbox = true;

    // Outputs
    @Output() taskClick = new EventEmitter<Task>();
    @Output() taskDoubleClick = new EventEmitter<Task>();
    @Output() selectionChange = new EventEmitter<{ task: Task; selected: boolean }>();
    @Output() taskUpdate = new EventEmitter<Task>();

    // Host bindings for row styling
    @HostBinding('class.selected') get selectedClass() {
        return this.selected;
    }

    @HostBinding('class.clickable') get clickableClass() {
        return true;
    }

    @HostBinding('class.editing') get editingClass() {
        return this.isEditingAny();
    }

    // Inline editing state
    editingField: string | null = null;
    editValue: any = null;
    originalValue: any = null;
    loading = false;
    error: string | null = null;

    // Available options for select fields
    readonly statusOptions = [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
        { value: 'archived', label: 'Archived' }
    ];

    readonly priorityOptions = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
    ];

    // Private properties
    private destroy$ = new Subject<void>();

    constructor(
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    /**
     * Initialize component
     */
    ngOnInit(): void {
        // No initialization needed for now
    }

    /**
     * Clean up subscriptions
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Handle row click
     */
    onRowClick(event: MouseEvent): void {
        // Prevent selection toggle when clicking on interactive elements
        if ((event.target as HTMLElement).closest('button, a, input, select, .editable-field')) {
            return;
        }

        this.taskClick.emit(this.task);
    }

    /**
     * Check if any field is being edited
     */
    isEditingAny(): boolean {
        return this.editingField !== null;
    }

    /**
     * Check if a specific field is being edited
     */
    isEditing(field: string): boolean {
        return this.editingField === field;
    }

    /**
     * Start editing a field
     */
    startEditing(field: string, event?: MouseEvent): void {
        if (event) {
            event.stopPropagation();
        }

        // Don't start editing if already editing another field
        if (this.editingField && this.editingField !== field) {
            return;
        }

        this.editingField = field;
        this.originalValue = this.getFieldValue(field);
        this.editValue = this.originalValue;
        this.error = null;

        // Focus the input after a brief delay to ensure DOM is updated
        setTimeout(() => {
            const element = document.querySelector(`[data-edit-field="${field}"]`) as HTMLInputElement;
            if (element) {
                element.focus();
                if (element.type === 'text') {
                    element.select();
                }
            }
        }, 50);
    }

    /**
     * Get the current value of a field
     */
    getFieldValue(field: string): any {
        switch (field) {
            case 'title':
                return this.task.title;
            case 'status':
                return this.task.status;
            case 'priority':
                return this.task.priority;
            case 'assignee_id':
                return this.task.assignee_id;
            case 'due_date':
                return this.task.due_date;
            default:
                return null;
        }
    }

    /**
     * Save the current edit
     */
    saveEdit(): void {
        if (!this.editingField || this.loading) {
            return;
        }

        // Check if value actually changed
        if (this.editValue === this.originalValue) {
            this.cancelEdit();
            return;
        }

        this.loading = true;
        this.error = null;

        // Prepare update payload with proper typing
        const updateData: TaskUpdate = {};
        switch (this.editingField) {
            case 'title':
                updateData.title = this.editValue;
                break;
            case 'status':
                updateData.status = this.editValue;
                break;
            case 'priority':
                updateData.priority = this.editValue;
                break;
            case 'assignee_id':
                updateData.assignee_id = this.editValue;
                break;
            case 'due_date':
                updateData.due_date = this.editValue;
                break;
        }

        // Get current workspace context
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.error = 'No tenant or workspace context';
                this.loading = false;
                return;
            }

            // Optimistic update - update local task immediately
            const optimisticTask: Task = {
                ...this.task,
                ...updateData,
                // Ensure labels property is properly typed
                labels: this.task.labels,
                // Ensure custom_values property is properly typed
                custom_values: this.task.custom_values
            };
            this.taskUpdate.emit(optimisticTask);

            // Send update to server
            this.taskService.updateTask(
                parseInt(context.currentTenant.id, 10),
                parseInt(context.currentWorkspace.id, 10),
                this.task.id,
                updateData
            ).pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    // Rollback on error
                    this.taskUpdate.emit(this.task);
                    this.error = error.message || 'Failed to update task';
                    this.loading = false;
                    return of(null);
                })
            ).subscribe(updatedTask => {
                this.loading = false;
                if (updatedTask) {
                    this.taskUpdate.emit(updatedTask);
                    this.editingField = null;
                    this.editValue = null;
                    this.originalValue = null;
                }
            });
        });
    }

    /**
     * Cancel the current edit
     */
    cancelEdit(): void {
        this.editingField = null;
        this.editValue = null;
        this.originalValue = null;
        this.error = null;
        this.loading = false;
    }

    /**
     * Handle keydown events for editing
     */
    onEditKeydown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.saveEdit();
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelEdit();
                break;
        }
    }

    /**
     * Handle blur events for editing
     */
    onEditBlur(): void {
        // Small delay to allow other click events to process
        setTimeout(() => {
            if (!this.loading) {
                this.saveEdit();
            }
        }, 150);
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
            case 'review':
                return 'status-review';
            case 'done':
                return 'status-done';
            case 'archived':
                return 'status-archived';
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
    formatDate(dateString?: string | null): string {
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
    isOverdue(dateString?: string | null): boolean {
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