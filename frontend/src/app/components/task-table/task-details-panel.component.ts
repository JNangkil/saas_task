import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Task, TaskComment, TaskUpdate, User, Label } from '../../models';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';

/**
 * TaskDetailsPanelComponent - Full task viewing and editing panel
 * 
 * This component provides a comprehensive task details interface with:
 * - Rich text description editor
 * - Activity log section
 * - Comments section
 * - Attachments section
 * - Close/minimize behavior
 * - Task editing capabilities
 */
@Component({
    selector: 'app-task-details-panel',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './task-details-panel.component.html',
    styleUrls: ['./task-details-panel.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailsPanelComponent implements OnInit, OnDestroy {
    // Inputs
    @Input() task!: Task;
    @Input() visible = true;
    @Input() minimized = false;

    // Outputs
    @Output() close = new EventEmitter<void>();
    @Output() minimize = new EventEmitter<void>();
    @Output() taskUpdate = new EventEmitter<Task>();

    // Host bindings
    @HostBinding('class.visible') get visibleClass() {
        return this.visible;
    }

    @HostBinding('class.minimized') get minimizedClass() {
        return this.minimized;
    }

    // Component state
    loading = false;
    error: string | null = null;
    editing = false;
    saving = false;

    // Form state
    editedTask: Partial<Task> = {};
    newComment = '';

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

    // Activity log
    activityLog: ActivityItem[] = [];

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
        this.initializeEditedTask();
        this.generateActivityLog();
    }

    /**
     * Clean up subscriptions
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize edited task with current task values
     */
    private initializeEditedTask(): void {
        this.editedTask = {
            title: this.task.title,
            description: this.task.description || '',
            status: this.task.status,
            priority: this.task.priority,
            assignee_id: this.task.assignee_id,
            due_date: this.task.due_date,
            start_date: this.task.start_date
        };
    }

    /**
     * Generate activity log from task history
     */
    private generateActivityLog(): void {
        this.activityLog = [
            {
                id: 1,
                type: 'created',
                message: `Task created by ${this.task.creator?.name || 'Unknown'}`,
                timestamp: this.task.created_at,
                user: this.task.creator
            },
            {
                id: 2,
                type: 'updated',
                message: `Task updated`,
                timestamp: this.task.updated_at,
                user: this.task.creator
            }
        ];

        // Add status change activity
        if (this.task.completed_at) {
            this.activityLog.push({
                id: 3,
                type: 'status_change',
                message: `Task marked as done`,
                timestamp: this.task.completed_at,
                user: this.task.assignee || this.task.creator
            });
        }

        // Add archived activity
        if (this.task.archived_at) {
            this.activityLog.push({
                id: 4,
                type: 'archived',
                message: `Task archived`,
                timestamp: this.task.archived_at,
                user: this.task.assignee || this.task.creator
            });
        }

        // Sort by timestamp (newest first)
        this.activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    /**
     * Start editing the task
     */
    startEditing(): void {
        this.editing = true;
        this.error = null;
    }

    /**
     * Cancel editing
     */
    cancelEditing(): void {
        this.editing = false;
        this.initializeEditedTask();
        this.error = null;
    }

    /**
     * Save task changes
     */
    saveTask(): void {
        if (this.saving) return;

        this.saving = true;
        this.error = null;

        // Prepare update payload
        const updateData: TaskUpdate = {
            title: this.editedTask.title,
            description: this.editedTask.description,
            status: this.editedTask.status,
            priority: this.editedTask.priority,
            assignee_id: this.editedTask.assignee_id,
            due_date: this.editedTask.due_date,
            start_date: this.editedTask.start_date
        };

        // Get current workspace context
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.error = 'No tenant or workspace context';
                this.saving = false;
                return;
            }

            // Send update to server
            this.taskService.updateTask(
                parseInt(context.currentTenant.id, 10),
                parseInt(context.currentWorkspace.id, 10),
                this.task.id,
                updateData
            ).pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    this.error = error.message || 'Failed to update task';
                    this.saving = false;
                    return of(null);
                })
            ).subscribe(updatedTask => {
                this.saving = false;
                if (updatedTask) {
                    this.taskUpdate.emit(updatedTask);
                    this.editing = false;
                    this.generateActivityLog(); // Refresh activity log
                }
            });
        });
    }

    /**
     * Add a new comment
     */
    addComment(): void {
        if (!this.newComment.trim() || this.loading) return;

        this.loading = true;
        this.error = null;

        // TODO: Implement comment creation via TaskService
        // For now, just simulate adding a comment
        setTimeout(() => {
            const comment: TaskComment = {
                id: Date.now(),
                task_id: this.task.id,
                user_id: 1, // TODO: Get current user ID
                content: this.newComment,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (!this.task.comments) {
                this.task.comments = [];
            }
            this.task.comments.unshift(comment);

            this.newComment = '';
            this.loading = false;

            // Add to activity log
            this.activityLog.unshift({
                id: Date.now(),
                type: 'comment',
                message: `Comment added`,
                timestamp: comment.created_at,
                user: { id: 1, name: 'Current User', email: 'user@example.com' } as User
            });
        }, 500);
    }

    /**
     * Handle close panel
     */
    onClose(): void {
        this.close.emit();
    }

    /**
     * Handle minimize panel
     */
    onMinimize(): void {
        this.minimize.emit();
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
     * Format date for display
     */
    formatDate(dateString?: string): string {
        if (!dateString) return '';

        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
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
     * Get activity icon based on type
     */
    getActivityIcon(type: string): string {
        switch (type) {
            case 'created':
                return '✨';
            case 'updated':
                return '✏️';
            case 'status_change':
                return '🔄';
            case 'comment':
                return '💬';
            case 'archived':
                return '📦';
            default:
                return '📝';
        }
    }

    /**
     * Get visible labels (limit to 5 for display)
     */
    getVisibleLabels(): Label[] {
        return this.task.labels?.slice(0, 5) || [];
    }

    /**
     * Get count of hidden labels
     */
    getHiddenLabelsCount(): number {
        return Math.max(0, (this.task.labels?.length || 0) - 5);
    }
}

/**
 * Interface for activity log items
 */
interface ActivityItem {
    id: number;
    type: string;
    message: string;
    timestamp: string;
    user?: User;
}