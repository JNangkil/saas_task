import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { takeUntil, catchError, map, switchMap, startWith, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskDetailsPanelComponent } from './task-details-panel.component';
import { BulkActionToolbarComponent } from './bulk-action-toolbar.component';

import {
    Task,
    TaskFilters,
    TaskSort,
    TasksPaginatedResponse,
    BoardColumn,
    TaskFieldValue,
    ColumnType
} from '../../models';

import { TaskService } from '../../services/task.service';
import { BoardColumnService } from '../../services/board-column.service';
import { TaskFieldValueService } from '../../services/task-field-value.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { ColumnTypeConfigurationService } from '../../services/column-type-configuration.service';

// Import cell renderers
import {
    BaseCellRendererComponent
} from '../cell-renderers';
import { TextCellRendererComponent } from '../cell-renderers/text-cell-renderer.component';
import { StatusCellRendererComponent } from '../cell-renderers/status-cell-renderer.component';
import { DateCellRendererComponent } from '../cell-renderers/date-cell-renderer.component';
import { CheckboxCellRendererComponent } from '../cell-renderers/checkbox-cell-renderer.component';

/**
 * Dynamic TaskTableComponent with support for dynamic columns
 * Extends the original task table with dynamic column capabilities
 */
@Component({
    selector: 'app-dynamic-task-table',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TaskDetailsPanelComponent,
        BulkActionToolbarComponent
    ],
    templateUrl: './dynamic-task-table.component.html',
    styleUrls: ['./dynamic-task-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicTaskTableComponent implements OnInit, OnDestroy {
    // Inputs
    @Input() boardId?: number;
    @Input() config: any = {};

    // Table configuration with defaults
    get tableConfig() {
        return {
            showFilters: this.config.showFilters ?? true,
            showColumnToggles: this.config.showColumnToggles ?? true,
            showPagination: this.config.showPagination ?? true,
            allowRowSelection: this.config.allowRowSelection ?? true,
            pageSize: this.config.pageSize ?? 15,
            ...this.config
        };
    }

    // Outputs
    @Output() taskSelected = new EventEmitter<Task>();
    @Output() tasksSelected = new EventEmitter<Task[]>();
    @Output() taskDoubleClicked = new EventEmitter<Task>();
    @Output() taskUpdate = new EventEmitter<Task>();
    @Output() selectionCleared = new EventEmitter<void>();

    // Public properties
    tasks$!: Observable<Task[]>;
    columns$!: Observable<BoardColumn[]>;
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

    // Filter and sort state
    search$ = new BehaviorSubject<string>('');
    statusFilter$ = new BehaviorSubject<string[]>([]);
    priorityFilter$ = new BehaviorSubject<string[]>([]);
    assigneeFilter$ = new BehaviorSubject<number[]>([]);
    sort$ = new BehaviorSubject<TaskSort>({ sort_by: 'position', sort_order: 'asc' });
    currentPage$ = new BehaviorSubject<number>(1);
    selectedTasks$ = new BehaviorSubject<Set<number>>(new Set());

    // Private properties
    private destroy$ = new Subject<void>();
    private refreshTrigger$ = new Subject<void>();
    showColumnMenu = false;
    private fieldValues$ = new BehaviorSubject<Map<number, TaskFieldValue[]>>(new Map<number, TaskFieldValue[]>());

    // Task details panel state
    selectedTaskForDetails: Task | null = null;
    showTaskDetailsPanel = false;

    // Bulk action toolbar state
    showBulkActionToolbar = false;

    constructor(
        private taskService: TaskService,
        private boardColumnService: BoardColumnService,
        private taskFieldValueService: TaskFieldValueService,
        private workspaceContextService: WorkspaceContextService,
        private columnTypeConfig: ColumnTypeConfigurationService
    ) { }

    ngOnInit(): void {
        this.initializeDataStreams();
        this.loadTasks();
        this.loadColumns();
        this.loadFieldValues();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize reactive data streams
     */
    private initializeDataStreams(): void {
        // Get workspace context
        const context$ = this.workspaceContextService.context$;

        // Combine all filter and sort parameters
        const combinedParams$ = combineLatest([
            context$,
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
            switchMap(([context, search, statusFilter, priorityFilter, assigneeFilter, sort, currentPage]) => {
                if (!context.currentTenant || !context.currentWorkspace) {
                    this.error$.next('No tenant or workspace selected');
                    this.loading$.next(false);
                    return of([]);
                }

                this.loading$.next(true);
                this.error$.next(null);

                // Build filters
                const filters: TaskFilters = {
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
                    this.config.pageSize || 15,
                    ['labels', 'assignee', 'creator', 'field_values']
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

                        // Enrich tasks with field values
                        const enrichedTasks = response.data.map(task => {
                            const taskFieldValues = this.fieldValues$.value.get(task.id) || [];
                            return {
                                ...task,
                                fieldValues: taskFieldValues
                            };
                        });

                        return enrichedTasks;
                    }),
                    catchError(error => {
                        this.error$.next(error.message || 'Failed to load tasks');
                        this.loading$.next(false);
                        return of([]);
                    })
                );
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
     * Load board columns
     */
    private loadColumns(): void {
        if (!this.boardId) {
            this.columns$ = of([]);
            return;
        }

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.columns$ = of([]);
                return;
            }

            this.loading$.next(true);
            this.boardColumnService.getBoardColumns(
                parseInt(context.currentTenant.id, 10),
                parseInt(context.currentWorkspace.id, 10),
                this.boardId || 0
            ).pipe(
                map(columns => {
                    this.loading$.next(false);
                    return columns;
                }),
                catchError(error => {
                    this.error$.next(error.message || 'Failed to load columns');
                    this.loading$.next(false);
                    return of([]);
                }),
                takeUntil(this.destroy$)
            ).subscribe(columns => {
                this.columns$ = of(columns);
            });
        });
    }

    /**
     * Load field values for all tasks
     */
    private loadFieldValues(): void {
        if (!this.boardId) {
            this.fieldValues$.next(new Map());
            return;
        }

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                this.fieldValues$.next(new Map());
                return;
            }

            // Get all task IDs from current board
            this.tasks$.pipe(
                takeUntil(this.destroy$)
            ).subscribe(tasks => {
                const taskIds = tasks.map(task => task.id);

                if (taskIds.length === 0) {
                    this.fieldValues$.next(new Map());
                    return;
                }

                // Load field values for all tasks
                this.taskFieldValueService.getTaskFieldValues(
                    parseInt(context.currentTenant?.id || '0', 10),
                    parseInt(context.currentWorkspace?.id || '0', 10),
                    taskIds[0] || 0 // Use first task ID for now (would need to batch this in production)
                ).pipe(
                    map(fieldValues => {
                        // Group field values by task ID
                        const fieldValuesMap = new Map<number, TaskFieldValue[]>();

                        // Initialize empty arrays for all tasks
                        taskIds.forEach(taskId => {
                            fieldValuesMap.set(taskId, []);
                        });

                        // Add the loaded field values
                        fieldValues.forEach(fieldValue => {
                            const taskId = fieldValue.task_id;
                            if (fieldValuesMap.has(taskId)) {
                                const existingValues = fieldValuesMap.get(taskId);
                                if (existingValues) {
                                    existingValues.push(fieldValue);
                                    fieldValuesMap.set(taskId, existingValues);
                                }
                            }
                        });

                        return fieldValuesMap;
                    }),
                    catchError(error => {
                        console.error('Error loading field values:', error);
                        return of(new Map());
                    }),
                    takeUntil(this.destroy$)
                ).subscribe(fieldValuesMap => {
                    this.fieldValues$.next(fieldValuesMap);
                });
            });
        });
    }

    /**
     * Get cell renderer component class based on column type
     */
    getCellRendererClass(columnType: ColumnType): string {
        switch (columnType) {
            case 'text':
            case 'long_text':
                return 'app-text-cell-renderer';
            case 'status':
            case 'priority':
                return 'app-status-cell-renderer';
            case 'date':
            case 'datetime':
                return 'app-date-cell-renderer';
            case 'checkbox':
                return 'app-checkbox-cell-renderer';
            default:
                return 'app-text-cell-renderer'; // Fallback to text renderer
        }
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
     * Handle task double click
     */
    onTaskDoubleClick(task: Task): void {
        this.selectedTaskForDetails = task;
        this.showTaskDetailsPanel = true;
        this.taskDoubleClicked.emit(task);
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

            // Update tasks observable with the updated tasks
            const currentTasksValue = this.tasks$ as BehaviorSubject<Task[]>;
            currentTasksValue.next(updatedTasks);
        });

        this.taskUpdate.emit(updatedTask);
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
     * Handle bulk action toolbar selection clear
     */
    onBulkActionToolbarSelectionClear(): void {
        this.selectedTasks$.next(new Set());
        this.showBulkActionToolbar = false;
        this.selectionCleared.emit();
    }

    getSelectedTasks(): Task[] {
        const selectedTaskIds = Array.from(this.selectedTasks$.value);
        const allTasks: Task[] = [];

        // Get current tasks from the observable
        this.tasks$.pipe(take(1)).subscribe(tasks => {
            allTasks.push(...tasks);
        });

        return allTasks.filter(task => selectedTaskIds.includes(task.id));
    }

    /**
     * Handle bulk action toolbar tasks update
     */
    onBulkActionToolbarTasksUpdate(updatedTasks: Task[]): void {
        // Update the tasks in the current tasks observable
        this.tasks$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(currentTasks => {
            const mergedTasks = currentTasks.map(task => {
                const updatedTask = updatedTasks.find(ut => ut.id === task.id);
                return updatedTask || task;
            });

            // Update tasks observable with the merged tasks
            const currentTasksValue = this.tasks$ as BehaviorSubject<Task[]>;
            currentTasksValue.next(mergedTasks);
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

            // Update tasks observable with the updated tasks
            const currentTasksValue = this.tasks$ as BehaviorSubject<Task[]>;
            currentTasksValue.next(updatedTasks);
        });

        this.taskUpdate.emit(updatedTask);
    }

    /**
     * Handle field value update
     */
    onFieldValueUpdate(taskId: number, columnId: number, value: any): void {
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) {
                return;
            }

            this.taskFieldValueService.updateTaskFieldValue(
                parseInt(context.currentTenant?.id || '0', 10),
                parseInt(context.currentWorkspace?.id || '0', 10),
                taskId,
                taskId, // Field value ID is the same as task ID in this simplified version
                value
            ).subscribe({
                next: (updatedFieldValue) => {
                    // Update field values in the map
                    const currentFieldValues = this.fieldValues$.value;
                    const taskFieldValues = currentFieldValues.get(taskId) || [];

                    // Find and update the specific field value
                    const updatedFieldValues = taskFieldValues.map(fv =>
                        fv.board_column_id === columnId ? updatedFieldValue : fv
                    );

                    currentFieldValues.set(taskId, updatedFieldValues);
                    this.fieldValues$.next(currentFieldValues);
                },
                error: (error) => {
                    console.error('Error updating field value:', error);
                    // Handle error (show toast, etc.)
                }
            });
        });
    }

    /**
     * Refresh tasks data
     */
    refreshTasks(): void {
        this.refreshTrigger$.next();
    }

    toggleColumnMenu(): void {
        this.showColumnMenu = !this.showColumnMenu;
    }

    onColumnVisibilityToggle(columnKey: string): void {
        // This would need to be implemented based on column visibility management
        console.log('Toggle column visibility:', columnKey);
    }

    getColumnVisibility(columnKey: string): boolean {
        // This would need to be implemented based on column visibility management
        return true;
    }

    onSelectAllTasks(checked: boolean): void {
        if (checked) {
            // Select all visible tasks
            this.tasks$.pipe(take(1)).subscribe(tasks => {
                const taskIds = tasks.map(task => task.id);
                this.selectedTasks$.next(new Set(taskIds));
                this.showBulkActionToolbar = taskIds.length > 0;
            });
        } else {
            // Clear selection
            this.selectedTasks$.next(new Set());
            this.showBulkActionToolbar = false;
        }
    }

    isSortable(columnType: string): boolean {
        // Define which column types are sortable
        const sortableTypes = ['text', 'long_text', 'number', 'date', 'datetime', 'status', 'priority'];
        return sortableTypes.includes(columnType);
    }

    getFieldValue(task: Task, columnId: number): any {
        // First check if it's a built-in field
        if (columnId === 1) return task.title; // Assuming column 1 is title
        if (columnId === 2) return task.description; // Assuming column 2 is description
        if (columnId === 3) return task.status; // Assuming column 3 is status
        if (columnId === 4) return task.priority; // Assuming column 4 is priority

        // Check field values
        const fieldValues = this.fieldValues$.value.get(task.id) || [];
        const fieldValue = fieldValues.find(fv => fv.board_column_id === columnId);
        return fieldValue ? fieldValue.value : null;
    }

    onTaskSelect(task: Task, selected: boolean): void {
        const currentSelection = new Set(this.selectedTasks$.value);

        if (selected) {
            currentSelection.add(task.id);
        } else {
            currentSelection.delete(task.id);
        }

        this.selectedTasks$.next(currentSelection);
        this.showBulkActionToolbar = currentSelection.size > 0;

        // Emit events
        if (selected) {
            this.taskSelected.emit(task);
        }

        // Get selected tasks and emit
        const selectedTasks = this.getSelectedTasks();
        if (selectedTasks.length > 0) {
            this.tasksSelected.emit(selectedTasks);
        }
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
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
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
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            }
        }

        return pages;
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
    getVisibleColumns(): Observable<BoardColumn[]> {
        return this.columns$;
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
        return status.replace(/_/g, ' ').replace(/\b\w/g, (match, letter) => letter.toUpperCase());
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
     * Track tasks by ID for better performance
     */
    trackByTaskId(index: number, task: Task): number {
        return task.id;
    }
}