import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

@Component({
    selector: 'app-kanban-view',
    standalone: true,
    imports: [CommonModule, DragDropModule, KanbanColumnComponent],
    templateUrl: './kanban-view.component.html',
    styleUrls: ['./kanban-view.component.scss']
})
export class KanbanViewComponent implements OnInit, OnChanges, OnDestroy {
    @Input() boardId: number | undefined;
    @Input() config: any = {}; // { group_by: 'status' }

    columns$ = new BehaviorSubject<KanbanColumn[]>([]);
    loading$ = new BehaviorSubject<boolean>(false);
    private destroy$ = new Subject<void>();

    constructor(
        private preferenceService: BoardViewPreferenceService,
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    ngOnInit() {
        this.loadTasks();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['boardId'] || changes['config']) {
            this.loadTasks();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
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

                // For Kanban, we typically want "all" tasks or a large page size, and grouped
                // We'll use the 'view=kanban' param we added to the API
                return this.taskService.getTasks(
                    parseInt(context.currentTenant.id),
                    parseInt(context.currentWorkspace.id),
                    this.boardId,
                    {} as any, // filters
                    undefined, // sort
                    1,
                    100, // Large page size for now
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
        const groupBy = this.config?.group_by || 'status';

        // TODO: Fetch dynamic columns from board configuration
        // For now, hardcoded status columns
        const columns: KanbanColumn[] = [
            { id: 'todo', title: 'To Do', tasks: [], color: '#e5e7eb' },
            { id: 'in_progress', title: 'In Progress', tasks: [], color: '#93c5fd' },
            { id: 'review', title: 'Start Review', tasks: [], color: '#fde047' }, // Example extra column
            { id: 'done', title: 'Done', tasks: [], color: '#86efac' }
        ];

        // Map Tasks to Columns
        tasks.forEach(task => {
            // Robust status matching
            const statusKey = task.status || 'todo';
            // Find exact match or default
            let column = columns.find(c => c.id === statusKey);

            // If dynamic columns existed, we would find by ID or name
            if (!column) {
                // Fallback for unknown status
                column = columns[0];
            }

            column.tasks.push(task);
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
            const newStatus = event.container.id; // Using column ID as status

            this.updateTaskStatus(task, newStatus);
        }
    }

    updateTaskStatus(task: Task, status: string) {
        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) return;

            this.taskService.updateTask(
                parseInt(context.currentTenant.id),
                parseInt(context.currentWorkspace.id),
                task.id,
                { status: status as any }
            ).subscribe({
                next: (updated) => {
                    console.log('Task status updated', updated);
                    task.status = status as any; // Optimistic confirmation
                },
                error: (err) => {
                    console.error('Failed to update status', err);
                    // TODO: Rollback drag
                }
            })
        });
    }
}
