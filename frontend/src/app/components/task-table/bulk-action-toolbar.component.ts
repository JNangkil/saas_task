import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Task, TaskUpdate, User } from '../../models';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';

/**
 * BulkActionToolbarComponent - Toolbar for bulk task operations
 * 
 * This component provides bulk action functionality with:
 * - Bulk status change
 * - Bulk priority change
 * - Bulk assignee change
 * - Bulk delete/archive functionality
 * - Selection management
 */
@Component({
    selector: 'app-bulk-action-toolbar',
    standalone: true,
    imports: [],
    templateUrl: './bulk-action-toolbar.component.html',
    styleUrls: ['./bulk-action-toolbar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkActionToolbarComponent implements OnInit, OnDestroy {
    // Inputs
    @Input() selectedTasks: Task[] = [];
    @Input() visible = true;

    // Outputs
    @Output() tasksUpdated = new EventEmitter<Task[]>();
    @Output() selectionCleared = new EventEmitter<void>();

    // Component state
    loading = false;
    error: string | null = null;

    // Bulk action state
    bulkStatus = '';
    bulkPriority = '';
    bulkAssigneeId: number | null = null;

    // Available options
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

    // Mock users for assignee dropdown (TODO: Replace with actual workspace users)
    readonly assigneeOptions: User[] = [
        { id: 1, name: 'User 1', email: 'user1@example.com', created_at: '', updated_at: '' },
        { id: 2, name: 'User 2', email: 'user2@example.com', created_at: '', updated_at: '' },
        { id: 3, name: 'User 3', email: 'user3@example.com', created_at: '', updated_at: '' }
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
     * Check if any tasks are selected
     */
    hasSelectedTasks(): boolean {
        return this.selectedTasks.length > 0;
    }

    /**
     * Get selection count text
     */
    getSelectionText(): string {
        const count = this.selectedTasks.length;
        return `${count} task${count !== 1 ? 's' : ''} selected`;
    }

    /**
     * Apply bulk status change
     */
    applyBulkStatusChange(): void {
        if (!this.bulkStatus || this.loading) return;

        this.performBulkUpdate({ status: this.bulkStatus as any });
    }

    /**
     * Apply bulk priority change
     */
    applyBulkPriorityChange(): void {
        if (!this.bulkPriority || this.loading) return;

        this.performBulkUpdate({ priority: this.bulkPriority as any });
    }

    /**
     * Apply bulk assignee change
     */
    applyBulkAssigneeChange(): void {
        if (this.bulkAssigneeId === null || this.loading) return;

        this.performBulkUpdate({ assignee_id: this.bulkAssigneeId });
    }

    /**
     * Archive selected tasks
     */
    archiveSelectedTasks(): void {
        if (this.loading) return;

        this.performBulkUpdate({ status: 'archived' });
    }

    /**
     * Delete selected tasks
     */
    deleteSelectedTasks(): void {
        if (this.loading || !confirm(`Are you sure you want to delete ${this.selectedTasks.length} task(s)? This action cannot be undone.`)) {
            return;
        }

        this.loading = true;
        this.error = null;

        // Get current workspace context
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.error = 'No tenant or workspace context';
                this.loading = false;
                return;
            }

            // TODO: Implement actual bulk delete via TaskService
            // For now, simulate deletion
            setTimeout(() => {
                this.loading = false;
                this.selectionCleared.emit();

                // Emit empty array to indicate tasks were deleted
                this.tasksUpdated.emit([]);
            }, 1000);
        });
    }

    /**
     * Perform bulk update on selected tasks
     */
    private performBulkUpdate(updateData: Partial<TaskUpdate>): void {
        this.loading = true;
        this.error = null;

        // Get current workspace context
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.error = 'No tenant or workspace context';
                this.loading = false;
                return;
            }

            const tenantId = parseInt(context.currentTenant.id, 10);
            const workspaceId = parseInt(context.currentWorkspace.id, 10);

            // Create update observables for each task
            const updateObservables = this.selectedTasks.map(task =>
                this.taskService.updateTask(tenantId, workspaceId, task.id, updateData)
            );

            // TODO: Implement actual bulk update via TaskService
            // For now, simulate bulk update
            setTimeout(() => {
                const updatedTasks = this.selectedTasks.map(task => ({
                    ...task,
                    ...updateData,
                    // Ensure required properties are maintained
                    labels: task.labels || [],
                    custom_values: task.custom_values || []
                } as Task));

                this.loading = false;
                this.tasksUpdated.emit(updatedTasks);

                // Reset bulk action values
                this.bulkStatus = '';
                this.bulkPriority = '';
                this.bulkAssigneeId = null;
            }, 1000);
        });
    }

    /**
     * Clear selection
     */
    clearSelection(): void {
        this.selectionCleared.emit();
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
}