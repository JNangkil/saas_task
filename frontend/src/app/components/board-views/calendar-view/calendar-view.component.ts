import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskFilters, User } from '../../../models';
import { TaskService } from '../../../services/task.service';
import { WorkspaceContextService } from '../../../services/workspace-context.service';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { BoardStateService } from '../../../services/board-state.service';
import { BoardViewPreferenceService } from '../../../services/board-view-preference.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { CalendarMonthComponent } from './calendar-month/calendar-month.component';
import { CalendarWeekComponent } from './calendar-week/calendar-week.component';
import { CalendarDayComponent } from './calendar-day/calendar-day.component';
import { BoardFilterBarComponent } from '../board-filter-bar/board-filter-bar.component';
import { IWorkspaceMember } from '../../../interfaces/workspace.interface';

@Component({
    selector: 'app-calendar-view',
    standalone: true,
    imports: [CommonModule, CalendarMonthComponent, CalendarWeekComponent, CalendarDayComponent, BoardFilterBarComponent],
    templateUrl: './calendar-view.component.html',
    styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit, OnChanges, OnDestroy {
    @Input() boardId: number | undefined;
    @Input() config: any = {};

    viewMode: 'month' | 'week' | 'day' = 'month';
    dateDisplayMode: 'due_date' | 'start_date' = 'due_date';
    viewDate: Date = new Date();
    tasks: Task[] = [];
    loading = false;

    // Filters & Members
    filters: TaskFilters = {};
    members: User[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService,
        private boardStateService: BoardStateService,
        private boardViewPreferenceService: BoardViewPreferenceService,
        private workspaceService: WorkspaceService
    ) { }

    ngOnInit() {
        if (this.config?.date_field) {
            this.dateDisplayMode = this.config.date_field;
        }
        this.loadPreferences();
        // refreshView will be called after loading preferences or if boardId changes
        this.subscribeToUpdates();
        this.fetchMembers();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['boardId']) {
            this.loadPreferences();
            this.fetchMembers(); // Re-fetch members if board changes (though likely same workspace)
        }
        if (changes['config'] && this.config?.date_field) {
            this.dateDisplayMode = this.config.date_field;
            this.refreshView();
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

    handleTaskUpdate(task: Task) {
        // Optimistic update: remove and re-add to tasks array
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
            this.tasks.splice(idx, 1);
        }

        // Add back if it belongs in current view (simplified check)
        // TODO: Apply filters locally to decide if "task" should be visible?
        // For now, simple add. If filtering gets complex, we might want to re-fetch or check filters.
        this.tasks.push(task);
        this.tasks = [...this.tasks]; // Trigger change detection for inputs
    }

    loadPreferences() {
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$),
            switchMap(context => {
                if (!context.currentTenant || !context.currentWorkspace || !this.boardId) {
                    return of(null);
                }
                return this.boardViewPreferenceService.getPreferences(
                    context.currentTenant.id,
                    context.currentWorkspace.id,
                    this.boardId.toString()
                );
            })
        ).subscribe(pref => {
            if (pref && pref.filters) {
                this.filters = pref.filters;
            }
            this.refreshView();
        });
    }

    fetchMembers() {
        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$),
            switchMap(context => {
                if (!context.currentWorkspace) return of([]);
                return this.workspaceService.getWorkspaceMembers(context.currentWorkspace.id);
            })
        ).subscribe((workspaceMembers: IWorkspaceMember[]) => {
            // Adapt IWorkspaceMember to User
            this.members = workspaceMembers.map(m => ({
                id: parseInt(m.id), // Assuming Backend IDs are numeric but interface uses string
                name: m.name,
                email: m.email,
                created_at: m.joined_at,
                updated_at: m.joined_at
            } as User));
        });
    }

    refreshView() {
        this.fetchTasksForView();
    }

    fetchTasksForView() {
        if (!this.boardId) return;

        const { start, end } = this.getDateRange();

        this.loading = true;

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$),
            switchMap(context => {
                if (!context.currentTenant || !context.currentWorkspace || !this.boardId) {
                    return of({ data: [] });
                }

                // Make sure date field aligns with current mode
                const dateField = this.dateDisplayMode;

                const params: any = {
                    view: 'calendar',
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0],
                    date_field: dateField,
                    ...this.filters // Apply filters
                };

                // Add relations to avoid N+1 and ensure we have assignee/project data
                params.include = 'assignee,project';

                return this.taskService.getTasks(
                    parseInt(context.currentTenant.id),
                    parseInt(context.currentWorkspace.id),
                    this.boardId,
                    params as any, // TaskFilters properties are merged but types might need casting if strict
                    undefined,
                    1,
                    500
                );
            }),
            map((res: any) => res.data || [])
        ).subscribe({
            next: (tasks: Task[]) => {
                this.tasks = tasks;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load calendar tasks', err);
                this.loading = false;
            }
        });
    }

    getDateRange(): { start: Date, end: Date } {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const date = this.viewDate.getDate();

        if (this.viewMode === 'month') {
            // Get full month + padding
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            return { start, end };
        } else if (this.viewMode === 'week') {
            const day = this.viewDate.getDay();
            const start = new Date(this.viewDate);
            start.setDate(date - day);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return { start, end };
        } else {
            // Day
            const start = new Date(year, month, date);
            const end = new Date(year, month, date);
            return { start, end };
        }
    }

    onViewModeChange(mode: 'month' | 'week' | 'day') {
        this.viewMode = mode;
        this.refreshView();
    }

    onDateDisplayModeChange(mode: 'due_date' | 'start_date') {
        if (this.dateDisplayMode === mode) return;
        this.dateDisplayMode = mode;
        this.refreshView();
    }

    onFiltersChange(newFilters: TaskFilters) {
        this.filters = newFilters;
        this.refreshView();

        // Persist preferences
        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (context.currentTenant && context.currentWorkspace && this.boardId) {
                this.boardViewPreferenceService.updatePreferences(
                    context.currentTenant.id,
                    context.currentWorkspace.id,
                    this.boardId.toString(),
                    { filters: this.filters }
                ).subscribe();
            }
        });
    }

    previous() {
        if (this.viewMode === 'month') {
            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
        } else if (this.viewMode === 'week') {
            this.viewDate.setDate(this.viewDate.getDate() - 7);
            this.viewDate = new Date(this.viewDate); // Trigger change
        } else {
            this.viewDate.setDate(this.viewDate.getDate() - 1);
            this.viewDate = new Date(this.viewDate);
        }
        this.refreshView();
    }

    next() {
        if (this.viewMode === 'month') {
            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
        } else if (this.viewMode === 'week') {
            this.viewDate.setDate(this.viewDate.getDate() + 7);
            this.viewDate = new Date(this.viewDate);
        } else {
            this.viewDate.setDate(this.viewDate.getDate() + 1);
            this.viewDate = new Date(this.viewDate);
        }
        this.refreshView();
    }

    today() {
        this.viewDate = new Date();
        this.refreshView();
    }

    onTaskClick(task: Task) {
        this.boardStateService.selectTask(task);
    }

    onTaskDrop(event: { task: Task, newDate: string }) {
        this.updateTaskDate(event.task, event.newDate);
    }

    updateTaskDate(task: Task, dateStr: string) {
        this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
            if (!context.currentTenant || !context.currentWorkspace) return;

            const dateField = this.dateDisplayMode;
            const updatePayload: any = {};
            updatePayload[dateField] = dateStr;

            this.taskService.updateTask(
                parseInt(context.currentTenant.id),
                parseInt(context.currentWorkspace.id),
                task.id,
                updatePayload
            ).subscribe({
                next: (updated) => {
                    console.log('Task date updated', updated);
                    // Update local state is handled by handleTaskUpdate via subscription
                    // But we can double check locally if needed
                    (task as any)[dateField] = dateStr;
                    this.tasks = [...this.tasks]; // Force refresh
                },
                error: (err) => {
                    console.error('Failed to update task date', err);
                    // TODO: Rollback
                }
            });
        });
    }
}
