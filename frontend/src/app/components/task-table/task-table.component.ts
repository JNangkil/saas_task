import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { takeUntil, catchError, map, switchMap, startWith } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { TaskRowComponent } from '../task-row/task-row.component';
import { TaskDetailsPanelComponent } from './task-details-panel.component';
import { BulkActionToolbarComponent } from './bulk-action-toolbar.component';
import {
    Task,
    TaskFilters,
    TaskSort,
    TasksPaginatedResponse,
    Label,
    User
} from '../../models';

/**
 * Interface for column configuration
 */
export interface TaskColumn {
    key: string;
    label: string;
    visible: boolean;
    sortable?: boolean;
    width?: string;
}

/**
 * Interface for table configuration
 */
export interface TaskTableConfig {
    columns: TaskColumn[];
    pageSize: number;
    showPagination: boolean;
    showFilters: boolean;
    showColumnToggles: boolean;
    allowRowSelection: boolean;
}

/**
 * Default table configuration
 */
const DEFAULT_CONFIG: TaskTableConfig = {
    columns: [
        { key: 'title', label: 'Task', visible: true, sortable: true, width: '300px' },
        { key: 'status', label: 'Status', visible: true, sortable: true, width: '120px' },
        { key: 'priority', label: 'Priority', visible: true, sortable: true, width: '100px' },
        { key: 'assignee', label: 'Assignee', visible: true, sortable: true, width: '150px' },
        { key: 'due_date', label: 'Due Date', visible: true, sortable: true, width: '120px' },
        { key: 'labels', label: 'Labels', visible: true, sortable: false, width: '200px' }
    ],
    pageSize: 15,
    showPagination: true,
    showFilters: true,
    showColumnToggles: true,
    allowRowSelection: true
};

/**
 * TaskTableComponent - Monday.com-style task table with display functionality
 * 
 * This component provides a comprehensive task table interface with:
 * - Data fetching and pagination
 * - Filtering and sorting capabilities
 * - Column visibility management
 * - Row selection functionality
 * - Loading and error states
 * - Responsive design
 */
@Component({
    selector: 'app-task-table',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TaskRowComponent,
        TaskDetailsPanelComponent,
        BulkActionToolbarComponent
    ],
    templateUrl: './task-table.component.html',
    styleUrls: ['./task-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskTableComponent implements OnInit, OnDestroy {
    // Inputs
    @Input() boardId?: number;
    @Input() config: Partial<TaskTableConfig> = {};
    @Input() initialFilters: TaskFilters = {};
    @Input() initialSort: TaskSort = {};

    // Outputs
    @Output() taskSelected = new EventEmitter<Task>();
    @Output() tasksSelected = new EventEmitter<Task[]>();
    @Output() taskDoubleClicked = new EventEmitter<Task>();
    @Output() taskUpdate = new EventEmitter<Task>();
    @Output() selectionCleared = new EventEmitter<void>();

    // Public properties
    tasks$!: Observable<Task[]>;
    loading$ = new BehaviorSubject<boolean>(true);
    error$ = new BehaviorSubject<string | null>(null);
    pagination$ = new BehaviorSubject<{
        currentPage: number;
        totalPages: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>({
        currentPage: 1,
        totalPages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
    });

    // Table configuration
    tableConfig: TaskTableConfig = { ...DEFAULT_CONFIG, ...this.config };

    // Filter and sort state
    search$ = new BehaviorSubject<string>('');
    statusFilter$ = new BehaviorSubject<string[]>([]);
    priorityFilter$ = new BehaviorSubject<string[]>([]);
    assigneeFilter$ = new BehaviorSubject<number[]>([]);
    sort$ = new BehaviorSubject<TaskSort>({ sort_by: 'position', sort_order: 'asc' });
    currentPage$ = new BehaviorSubject<number>(1);
    selectedTasks$ = new BehaviorSubject<Set<number>>(new Set());

    // Column visibility
    visibleColumns$ = new BehaviorSubject<TaskColumn[]>(this.tableConfig.columns.filter(col => col.visible));

    // Private properties
    private destroy$ = new Subject<void>();
    private refreshTrigger$ = new Subject<void>();
    showColumnMenu = false;

    // Task details panel state
    selectedTaskForDetails: Task | null = null;
    showTaskDetailsPanel = false;

    // Bulk action toolbar state
    showBulkActionToolbar = false;

    constructor(
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    /**
     * Initialize component and set up data streams
     */
    ngOnInit(): void {
        this.initializeDataStreams();
        this.loadTasks();
    }

    /**
     * Clean up subscriptions
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize reactive data streams
     */
    private initializeDataStreams(): void {
        // Update visible columns when configuration changes
        this.visibleColumns$.next(this.tableConfig.columns.filter(col => col.visible));

        // Combine all filter and sort parameters
        const combinedParams$ = combineLatest([
            this.search$,
            this.statusFilter$,
            this.priorityFilter$,
            this.assigneeFilter$,
            this.sort$,
            this.currentPage$,
            this.refreshTrigger$.pipe(startWith(null))
        ]);

        // Create tasks observable with all parameters
        this.tasks$ = combinedParams$.pipe(
            switchMap(([search, statusFilter, priorityFilter, assigneeFilter, sort, currentPage]) => {
                return this.workspaceContextService.context$.pipe(
                    switchMap(context => {
                        if (!context.currentTenant || !context.currentWorkspace) {
                            this.error$.next('No tenant or workspace selected');
                            this.loading$.next(false);
                            return of([]);
                        }

                        this.loading$.next(true);
                        this.error$.next(null);

                        // Build filters
                        const filters: TaskFilters = {
                            ...this.initialFilters,
                            search: search || undefined,
                            status: statusFilter.length > 0 ? statusFilter : undefined,
                            priority: priorityFilter.length > 0 ? priorityFilter : undefined,
                            assignee_id: assigneeFilter.length > 0 ? assigneeFilter : undefined
                        };

                        // Get tasks with pagination
                        return this.taskService.getTasks(
                            parseInt(context.currentTenant.id, 10),
                            parseInt(context.currentWorkspace.id, 10),
                            this.boardId,
                            filters,
                            sort,
                            currentPage,
                            this.tableConfig.pageSize,
                            ['labels', 'assignee', 'creator']
                        ).pipe(
                            map(response => {
                                // Update pagination info
                                this.pagination$.next({
                                    currentPage: response.current_page,
                                    totalPages: response.last_page,
                                    total: response.total,
                                    hasNext: response.current_page < response.last_page,
                                    hasPrev: response.current_page > 1
                                });

                                return response.data;
                            }),
                            catchError(error => {
                                this.error$.next(error.message || 'Failed to load tasks');
                                this.loading$.next(false);
                                return of([]);
                            })
                        );
                    })
                );
            }),
            map(tasks => {
                this.loading$.next(false);
                return tasks;
            }),
            takeUntil(this.destroy$)
        );
    }

    /**
     * Load initial tasks
     */
    private loadTasks(): void {
        this.refreshTrigger$.next();
    }

    /**
     * Refresh tasks data
     */
    refreshTasks(): void {
        this.refreshTrigger$.next();
    }

    /**
     * Handle search input
     */
    onSearchChange(searchTerm: string): void {
        this.search$.next(searchTerm);
        this.currentPage$.next(1); // Reset to first page
    }

    /**
     * Handle status filter change
     */
    onStatusFilterChange(statuses: string[]): void {
        this.statusFilter$.next(statuses);
        this.currentPage$.next(1); // Reset to first page
    }

    /**
     * Handle priority filter change
     */
    onPriorityFilterChange(priorities: string[]): void {
        this.priorityFilter$.next(priorities);
        this.currentPage$.next(1); // Reset to first page
    }

    /**
     * Handle assignee filter change
     */
    onAssigneeFilterChange(assigneeIds: number[]): void {
        this.assigneeFilter$.next(assigneeIds);
        this.currentPage$.next(1); // Reset to first page
    }

    /**
     * Handle sort change
     */
    onSortChange(sortField: string): void {
        const currentSort = this.sort$.value;
        const newSort: TaskSort = {
            sort_by: sortField,
            sort_order: currentSort.sort_by === sortField && currentSort.sort_order === 'asc' ? 'desc' : 'asc'
        };
        this.sort$.next(newSort);
        this.currentPage$.next(1); // Reset to first page
    }

    /**
     * Handle page change
     */
    onPageChange(page: number): void {
        this.currentPage$.next(page);
    }

    onPageClick(page: string | number): void {
        if (page !== '...') {
            this.onPageChange(page as number);
        }
    }

    /**
     * Handle column visibility toggle
     */
    onColumnVisibilityToggle(columnKey: string): void {
        const updatedColumns = this.tableConfig.columns.map(col => {
            if (col.key === columnKey) {
                return { ...col, visible: !col.visible };
            }
            return col;
        });

        this.tableConfig.columns = updatedColumns;
        this.visibleColumns$.next(updatedColumns.filter(col => col.visible));
    }

    /**
     * Handle task selection
     */
    onTaskSelect(task: Task, selected: boolean): void {
        const currentSelected = new Set(this.selectedTasks$.value);

        if (selected) {
            currentSelected.add(task.id);
        } else {
            currentSelected.delete(task.id);
        }

        this.selectedTasks$.next(currentSelected);
        this.taskSelected.emit(task);

        // Show/hide bulk action toolbar based on selection
        this.showBulkActionToolbar = currentSelected.size > 0;

        // Emit all selected tasks
        this.tasks$.subscribe(tasks => {
            const selectedTasks = tasks.filter(task => currentSelected.has(task.id));
            this.tasksSelected.emit(selectedTasks);
        });
    }

    /**
     * Handle select all tasks
     */
    onSelectAllTasks(selected: boolean): void {
        this.tasks$.subscribe(tasks => {
            const newSelected = selected ? new Set(tasks.map(task => task.id)) : new Set<number>();
            this.selectedTasks$.next(newSelected);

            // Show/hide bulk action toolbar based on selection
            this.showBulkActionToolbar = newSelected.size > 0;

            const selectedTasks = selected ? [...tasks] : [];
            this.tasksSelected.emit(selectedTasks);
        });
    }

    /**
     * Handle task double click
     */
    onTaskDoubleClick(task: Task): void {
        this.selectedTaskForDetails = task;
        this.showTaskDetailsPanel = true;
        this.taskDoubleClicked.emit(task);
    }

    /**
     * Handle task details panel close
     */
    onTaskDetailsPanelClose(): void {
        this.showTaskDetailsPanel = false;
        this.selectedTaskForDetails = null;
    }

    /**
     * Handle task details panel minimize
     */
    onTaskDetailsPanelMinimize(): void {
        // TODO: Implement minimize functionality
        this.showTaskDetailsPanel = false;
    }

    /**
     * Handle task update from details panel
     */
    onTaskDetailsPanelUpdate(updatedTask: Task): void {
        // Update the task in the current tasks observable
        this.tasks$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(currentTasks => {
            const updatedTasks = currentTasks.map(task =>
                task.id === updatedTask.id ? updatedTask : task
            );

            // Create a new observable with the updated tasks
            this.tasks$ = of(updatedTasks);
        });

        this.taskUpdate.emit(updatedTask);
    }

    /**
     * Handle bulk action toolbar selection clear
     */
    onBulkActionToolbarSelectionClear(): void {
        this.selectedTasks$.next(new Set());
        this.showBulkActionToolbar = false;
        this.selectionCleared.emit();
    }

    /**
     * Handle bulk action toolbar tasks update
     */
    onBulkActionToolbarTasksUpdate(updatedTasks: Task[]): void {
        // Update the task in the current tasks observable
        this.tasks$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(currentTasks => {
            const mergedTasks = currentTasks.map(task => {
                const updatedTask = updatedTasks.find(ut => ut.id === task.id);
                return updatedTask || task;
            });

            // Create a new observable with the updated tasks
            this.tasks$ = of(mergedTasks);
        });

        // Emit task updates
        updatedTasks.forEach(updatedTask => {
            this.taskUpdate.emit(updatedTask);
        });
    }

    /**
     * Handle task update from inline editing
     */
    onTaskUpdate(updatedTask: Task): void {
        // Update the task in the current tasks observable
        this.tasks$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(currentTasks => {
            const updatedTasks = currentTasks.map(task =>
                task.id === updatedTask.id ? updatedTask : task
            );

            // Create a new observable with the updated tasks
            this.tasks$ = of(updatedTasks);
        });
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
     * Check if all tasks are selected
     */
    areAllTasksSelected(): boolean {
        const selectedCount = this.selectedTasks$.value.size;
        return selectedCount > 0;
    }

    /**
     * Get visible columns for display
     */
    getVisibleColumns(): TaskColumn[] {
        return this.visibleColumns$.value;
    }

    /**
     * Get selected tasks for bulk action toolbar
     */
    getSelectedTasks(): Task[] {
        const selectedTasks = this.selectedTasks$.value;
        this.tasks$.subscribe(tasks => {
            return tasks.filter(task => selectedTasks.has(task.id));
        }).unsubscribe();

        // Return empty array if no tasks loaded yet
        return [];
    }

    /**
     * Check if column is visible
     */
    getColumnVisibility(columnKey: string): boolean {
        return this.visibleColumns$.value.some(col => col.key === columnKey && col.visible);
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
     * Get avatar color based on email
     */
    getAvatarColor(email: string): string {
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
     * Math utility for template access
     */
    Math = Math;

    /**
     * Track tasks by ID for better performance
     */
    trackByTaskId(index: number, task: Task): number {
        return task.id;
    }

    /**
     * Toggle column menu visibility
     */
    toggleColumnMenu(): void {
        this.showColumnMenu = !this.showColumnMenu;
    }

    /**
     * Get page numbers for pagination
     */
    getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
        const pages: (number | string)[] = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    }
}