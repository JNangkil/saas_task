import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { Task, TaskComment, TaskUpdate, User, Label, Attachment } from '../../models';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { BoardStateService } from '../../services/board-state.service';

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
    uploading = false;

    // Form state
    editedTask: Partial<Task> = {};
    newComment = '';
    attachments: Attachment[] = [];

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
        private workspaceContextService: WorkspaceContextService,
        private boardStateService: BoardStateService
    ) { }

    /**
     * Initialize component
     */
    ngOnInit(): void {
        this.initializeEditedTask();
        this.generateActivityLog();
        this.subscribeToRealtimeEvents();
        this.loadAttachments();
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

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.error = 'No tenant or workspace context';
                this.loading = false;
                return;
            }

            this.taskService.addComment(
                parseInt(context.currentTenant.id, 10),
                parseInt(context.currentWorkspace.id, 10),
                this.task.id,
                this.newComment
            ).pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    this.error = error.message || 'Failed to add comment';
                    this.loading = false;
                    return of(null);
                })
            ).subscribe(comment => {
                this.loading = false;
                if (comment) {
                    // Update local state is handled by real-time event, but we can do it optimistically here too
                    // or just wait for the event.
                    // For better UX, let's clear input immediately.
                    this.newComment = '';
                }
            });
        });
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

    /**
     * Load attachments for the task
     */
    loadAttachments(): void {
        this.attachments = this.task.attachments || [];
    }

    /**
     * Handle file selection for upload
     */
    onFileSelected(event: Event): void {
        const element = event.currentTarget as HTMLInputElement;
        const files: FileList | null = element.files;

        if (files && files.length > 0) {
            this.uploadFiles(Array.from(files));
        }

        // Clear the input value to allow selecting the same file again
        element.value = '';
    }

    /**
     * Handle drag and drop files
     */
    onFilesDropped(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        const files: FileList | null = event.dataTransfer?.files || null;
        if (files && files.length > 0) {
            this.uploadFiles(Array.from(files));
        }
    }

    /**
     * Upload multiple files
     */
    uploadFiles(files: File[]): void {
        if (files.length === 0) return;

        this.uploading = true;
        this.error = null;

        // Use proper Observable pattern
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            const tenantId = context?.currentTenant?.id;
            const workspaceId = context?.currentWorkspace?.id;

            if (!tenantId || !workspaceId) {
                this.error = 'Tenant or workspace not found';
                this.uploading = false;
                return;
            }

            // Upload files one by one to track progress
            files.forEach((file, index) => {
                this.taskService.uploadAttachment(
                    parseInt(tenantId, 10),
                    parseInt(workspaceId, 10),
                    this.task.id,
                    file
                )
                    .pipe(
                        catchError(error => {
                            console.error('Error uploading file:', error);
                            this.error = `Failed to upload ${file.name}`;
                            return of(null);
                        }),
                        takeUntil(this.destroy$)
                    )
                    .subscribe(attachment => {
                        if (attachment) {
                            this.attachments.unshift(attachment);

                            // Add to activity log
                            this.activityLog.unshift({
                                id: attachment.id,
                                type: 'attachment',
                                message: `Attached ${attachment.original_filename}`,
                                timestamp: attachment.created_at,
                                user: attachment.user
                            });

                            // Re-sort activity log
                            this.activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        }

                        // Check if this was the last file
                        if (index === files.length - 1) {
                            this.uploading = false;
                        }
                    });
            });
        });
    }

    /**
     * Delete an attachment
     */
    deleteAttachment(attachment: Attachment): void {
        if (!confirm(`Are you sure you want to delete ${attachment.original_filename}?`)) {
            return;
        }

        // Use proper Observable pattern
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            const tenantId = context?.currentTenant?.id;
            const workspaceId = context?.currentWorkspace?.id;

            if (!tenantId || !workspaceId) {
                this.error = 'Tenant or workspace not found';
                return;
            }

            this.taskService.deleteAttachment(
                parseInt(tenantId, 10),
                parseInt(workspaceId, 10),
                attachment.id
            )
                .pipe(
                    catchError(error => {
                        console.error('Error deleting attachment:', error);
                        this.error = 'Failed to delete attachment';
                        return of(null);
                    }),
                    takeUntil(this.destroy$)
                )
                .subscribe(success => {
                    if (success) {
                        this.attachments = this.attachments.filter(a => a.id !== attachment.id);

                        // Add to activity log
                        this.activityLog.unshift({
                            id: Date.now(),
                            type: 'attachment_deleted',
                            message: `Deleted ${attachment.original_filename}`,
                            timestamp: new Date().toISOString(),
                            user: {
                                id: 0,
                                name: 'Current User',
                                email: '',
                                created_at: '',
                                updated_at: ''
                            }
                        });

                        // Re-sort activity log
                        this.activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    }
                });
        });
    }

    /**
     * Get download URL for an attachment
     */
    getAttachmentDownloadUrl(attachment: Attachment): string {
        let downloadUrl = '#';

        // Use proper Observable pattern but need to handle synchronously
        const context = this.workspaceContextService.context;
        const tenantId = context?.currentTenant?.id;
        const workspaceId = context?.currentWorkspace?.id;

        if (!tenantId || !workspaceId) {
            return '#';
        }

        return this.taskService.getAttachmentDownloadUrl(
            parseInt(tenantId, 10),
            parseInt(workspaceId, 10),
            attachment.id
        );
    }

    /**
     * Check if a file is an image
     */
    isImageFile(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    /**
     * Check if a file is a PDF
     */
    isPdfFile(mimeType: string): boolean {
        return mimeType === 'application/pdf';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private subscribeToRealtimeEvents(): void {
        // Comment Added
        this.boardStateService.commentAdded$
            .pipe(takeUntil(this.destroy$))
            .subscribe(comment => {
                if (comment.task_id === this.task.id) {
                    if (!this.task.comments) {
                        this.task.comments = [];
                    }
                    // Check if comment already exists (optimistic update prevention)
                    if (!this.task.comments.find(c => c.id === comment.id)) {
                        this.task.comments.unshift(comment);

                        // Add to activity log
                        this.activityLog.unshift({
                            id: comment.id,
                            type: 'comment',
                            message: 'Comment added',
                            timestamp: comment.created_at,
                            user: comment.user
                        });

                        // Re-sort activity log
                        this.activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    }
                }
            });

        // Comment Updated
        this.boardStateService.commentUpdated$
            .pipe(takeUntil(this.destroy$))
            .subscribe(updatedComment => {
                if (updatedComment.task_id === this.task.id) {
                    if (this.task.comments) {
                        const index = this.task.comments.findIndex(c => c.id === updatedComment.id);
                        if (index !== -1) {
                            this.task.comments[index] = updatedComment;
                        }
                    }
                }
            });

        // Comment Deleted
        this.boardStateService.commentDeleted$
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ commentId, taskId }) => {
                if (taskId === this.task.id) {
                    if (this.task.comments) {
                        this.task.comments = this.task.comments.filter(c => c.id !== commentId);

                        // Also remove from activity log
                        this.activityLog = this.activityLog.filter(item => item.id !== commentId || item.type !== 'comment');
                    }
                }
            });

        // Polled Updates (Fallback)
        this.boardStateService.polledUpdates$
            .pipe(takeUntil(this.destroy$))
            .subscribe(updates => {
                if (updates.comments && updates.comments.length > 0) {
                    let activityLogUpdated = false;
                    updates.comments.forEach(comment => {
                        if (comment.task_id === this.task.id) {
                            if (!this.task.comments) {
                                this.task.comments = [];
                            }
                            const index = this.task.comments.findIndex(c => c.id === comment.id);
                            if (index !== -1) {
                                // Update existing
                                this.task.comments[index] = comment;
                            } else {
                                // Add new
                                this.task.comments.unshift(comment);

                                // Add to activity log
                                this.activityLog.unshift({
                                    id: comment.id,
                                    type: 'comment',
                                    message: 'Comment added',
                                    timestamp: comment.created_at,
                                    user: comment.user
                                });
                                activityLogUpdated = true;
                            }
                        }
                    });

                    if (activityLogUpdated) {
                        this.activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    }
                }
            });
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