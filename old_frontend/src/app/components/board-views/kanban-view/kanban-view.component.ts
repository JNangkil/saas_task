import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { KanbanColumnComponent } from './kanban-column/kanban-column.component';
import { BoardViewPreferenceService } from '../../../services/board-view-preference.service';
import { TaskService } from '../../../services/task.service';
import { WorkspaceContextService } from '../../../services/workspace-context.service';
import { Task } from '../../../models/task.model';
import { BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, switchMap, catchError, map } from 'rxjs/operators';

interface KanbanColumn {
    id: string;
    title: string;
    tasks: Task[];
    color?: string;
}

import { BoardStateService } from '../../../services/board-state.service';

@Component({
    selector: 'app-kanban-view',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule, KanbanColumnComponent],
    templateUrl: './kanban-view.component.html',
    styleUrls: ['./kanban-view.component.scss']
})
export class KanbanViewComponent implements OnInit, OnChanges, OnDestroy {
    @Input() boardId: number | undefined;
    @Input() config: any = {}; // { group_by: 'status' }

    columns$ = new BehaviorSubject<KanbanColumn[]>([]);
    loading$ = new BehaviorSubject<boolean>(false);

    // Group By Options
    groupByOptions = [
        { value: 'status', label: 'Status' },
        { value: 'priority', label: 'Priority' },
        { value: 'assignee', label: 'Assignee' }
    ];

    currentGroupBy: 'status' | 'priority' | 'assignee' = 'status';
    collapsedColumns = new Set<string>();

    private destroy$ = new Subject<void>();

    constructor(
        private preferenceService: BoardViewPreferenceService,
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService,
        private boardStateService: BoardStateService
    ) { }

    ngOnInit() {
        this.currentGroupBy = this.config?.group_by || 'status';
        if (this.config?.collapsed_columns) {
            this.collapsedColumns = new Set(this.config.collapsed_columns);
        }
        this.loadTasks();
        this.subscribeToUpdates();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['boardId'] || changes['config']) {
            if (this.config?.group_by) {
                this.currentGroupBy = this.config.group_by;
            }
            if (this.config?.collapsed_columns) {
                this.collapsedColumns = new Set(this.config.collapsed_columns);
            }
            this.loadTasks();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    subscribeToUpdates() {
        this.boardStateService.taskUpdated$
            .pipe(takeUntil(this.destroy$))
            .subscribe(updatedTask => {
                if (updatedTask.board_id !== this.boardId) return;
                this.handleTaskUpdate(updatedTask);
            });
    }

    setGroupBy(groupBy: 'status' | 'priority' | 'assignee') {
        this.currentGroupBy = groupBy;

        // Persist preference
        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace || !this.boardId) return;

            this.preferenceService.updatePreferences(
                context.currentTenant.id,
                context.currentWorkspace.id,
                this.boardId.toString(),
                {
                    kanban_config: {
                        group_by: groupBy
                    }
                }
            ).subscribe();
        });

        // Re-organize existing tasks immediately
        // We need to fetch tasks from the columns to re-organize them, OR reload.
        // Reloading is safer to ensure we have all data (though we should have it).
        // Let's reload to be safe and simple for now.
        this.loadTasks();
    }

    isColumnCollapsed(columnId: string): boolean {
        return this.collapsedColumns.has(columnId);
    }

    toggleColumn(columnId: string) {
        if (this.collapsedColumns.has(columnId)) {
            this.collapsedColumns.delete(columnId);
        } else {
            this.collapsedColumns.add(columnId);
        }

        // Persist preference
        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace || !this.boardId) return;

            this.preferenceService.updatePreferences(
                context.currentTenant.id,
                context.currentWorkspace.id,
                this.boardId.toString(),
                {
                    kanban_config: {
                        group_by: this.currentGroupBy,
                        collapsed_columns: Array.from(this.collapsedColumns)
                    }
                }
            ).subscribe();
        });
    }

    // ... (handleTaskUpdate remains largely the same, but needs to be aware of grouping strategy if we want it perfect. 
    // For now, let's keep it simple and just reload on major changes or handle simple status updates if grouped by status)
    handleTaskUpdate(task: Task) {
        // If grouped by something else, simpler to just reload the view or re-organize
        // Re-organizing is better than network request.

        // We need to get all tasks currently valid.
        const allTasks: Task[] = [];
        this.columns$.value.forEach(col => allTasks.push(...col.tasks));

        // Update the specific task in the list
        const idx = allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
            allTasks[idx] = task;
        } else {
            allTasks.push(task);
        }

        this.organizeTasks(allTasks);
    }

    addTaskToColumn(columns: KanbanColumn[], task: Task) {
        // Deprecated by handleTaskUpdate re-org strategy, but keeping for compatibility if needed.
        // Actually, let's just use organizeTasks for everything to be consistent.
    }

    loadTasks() {
        if (!this.boardId) return;

        this.loading$.next(true);

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$),
            switchMap(context => {
                if (!context.currentTenant || !context.currentWorkspace || !this.boardId) {
                    return of({ data: [] });
                }

                // For Kanban, we typically want "all" tasks or a large page size
                return this.taskService.getTasks(
                    parseInt(context.currentTenant.id),
                    parseInt(context.currentWorkspace.id),
                    this.boardId,
                    {} as any, // filters
                    undefined, // sort
                    1,
                    100, // Large page size
                    ['labels', 'assignee', 'field_values']
                );
            }),
            map((response: any) => response.data || [])
        ).subscribe({
            next: (tasks: Task[]) => {
                this.organizeTasks(tasks);
                this.loading$.next(false);
            },
            error: (err) => {
                console.error('Failed to load kanban tasks', err);
                this.loading$.next(false);
            }
        });
    }

    organizeTasks(tasks: Task[]) {
        let columns: KanbanColumn[] = [];

        if (this.currentGroupBy === 'status') {
            columns = [
                { id: 'todo', title: 'To Do', tasks: [], color: '#e5e7eb' },
                { id: 'in_progress', title: 'In Progress', tasks: [], color: '#93c5fd' },
                { id: 'review', title: 'Review', tasks: [], color: '#fde047' },
                { id: 'done', title: 'Done', tasks: [], color: '#86efac' }
            ];

            tasks.forEach(task => {
                const statusKey = task.status || 'todo';
                let column = columns.find(c => c.id === statusKey);
                if (!column) column = columns[0];
                column.tasks.push(task);
            });

        } else if (this.currentGroupBy === 'priority') {
            columns = [
                { id: 'urgent', title: 'Urgent', tasks: [], color: '#ef4444' },
                { id: 'high', title: 'High', tasks: [], color: '#f97316' },
                { id: 'medium', title: 'Medium', tasks: [], color: '#eab308' },
                { id: 'low', title: 'Low', tasks: [], color: '#3b82f6' },
                { id: 'none', title: 'No Priority', tasks: [], color: '#e5e7eb' } // Optional
            ];

            tasks.forEach(task => {
                const priorityKey = (task.priority as string) || 'none';
                // 'none' isn't a valid Priority type in model but good to handle distinct 'null' if compatible
                // Model says priority: 'low' | 'medium' | 'high' | 'urgent'; 
                // So if missing, maybe it defaults or we put in 'low'? Let's assume 'low' or explicit fallback.
                let p = priorityKey === 'none' ? 'low' : priorityKey;

                let column = columns.find(c => c.id === p);
                if (!column) column = columns.find(c => c.id === 'low')!;
                column.tasks.push(task);
            });

        } else if (this.currentGroupBy === 'assignee') {
            // dynamic columns based on assignees found in tasks + Unassigned
            const assigneeMap = new Map<number, KanbanColumn>();

            // Fixed Unassigned Column
            const unassignedCol: KanbanColumn = { id: 'unassigned', title: 'Unassigned', tasks: [], color: '#e5e7eb' };

            // We need unique assignees.
            // In a real app we might fetch all workspace members to show empty columns too.
            // For now, let's build columns from the tasks present + Unassigned.

            tasks.forEach(task => {
                if (task.assignee) {
                    if (!assigneeMap.has(task.assignee.id)) {
                        assigneeMap.set(task.assignee.id, {
                            id: task.assignee.id.toString(),
                            title: task.assignee.name,
                            tasks: [],
                            color: '#e5e7eb' // standard color or random?
                        });
                    }
                    assigneeMap.get(task.assignee.id)!.tasks.push(task);
                } else {
                    unassignedCol.tasks.push(task);
                }
            });

            columns = [unassignedCol, ...Array.from(assigneeMap.values())];
        }

        // Sort tasks in columns if needed (by position)
        columns.forEach(col => {
            col.tasks.sort((a, b) => a.position - b.position);
        });

        this.columns$.next(columns);
    }

    drop(event: CdkDragDrop<Task[]>) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
            // TODO: Call updateTaskPosition
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );

            const task = event.container.data[event.currentIndex];
            const targetId = event.container.id;

            this.updateTaskAfterDrop(task, targetId);
        }
    }

    updateTaskAfterDrop(task: Task, targetId: string) {
        let updatePayload: any = {};

        if (this.currentGroupBy === 'status') {
            updatePayload = { status: targetId };
            task.status = targetId as any;
        } else if (this.currentGroupBy === 'priority') {
            // Handle 'none' or mapped values if necessary
            if (targetId === 'none') {
                // Determine what 'no priority' means. Model enforces 4 values. 
                // Using 'low' as default or maybe strict mode? 
                // Let's assume we mapped 'none' to 'low' in fetching, so targetId 'none' shouldn't happen 
                // unless we created that column.
                // In organizeTasks we have 'none' column but mapped to 'low' logic? 
                // Actually in organizeTasks I put 'none'. 
                // If I drop in 'none', what do I set? 'low'?
                updatePayload = { priority: 'low' };
                task.priority = 'low';
            } else {
                updatePayload = { priority: targetId };
                task.priority = targetId as any;
            }
        } else if (this.currentGroupBy === 'assignee') {
            if (targetId === 'unassigned') {
                updatePayload = { assignee_id: null };
                task.assignee_id = undefined;
                task.assignee = undefined;
            } else {
                updatePayload = { assignee_id: parseInt(targetId) };
                task.assignee_id = parseInt(targetId);
                // We'd need to fetch the user object to update task.assignee properly for UI, 
                // but the backend will handle the save. 
                // For optimistic UI in 'organizeTasks' next run (if we don't reload), 
                // we might want to patch assignee name if possible or just wait for reload.
                // Ideally we find the user from the column title or similar.
                // For now, simple optimistic update.
            }
        }

        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) return;

            this.taskService.updateTask(
                parseInt(context.currentTenant.id),
                parseInt(context.currentWorkspace.id),
                task.id,
                updatePayload
            ).subscribe({
                next: (updated) => {
                    console.log('Task updated after drop', updated);
                    // could merge updated fields to task
                },
                error: (err) => {
                    console.error('Failed to update task', err);
                    // TODO: Rollback
                }
            })
        });
    }
}
