import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { WorkspaceContextService } from '../../../services/workspace-context.service';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';

@Component({
    selector: 'app-calendar-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './calendar-view.component.html',
    styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit, OnChanges, OnDestroy {
    @Input() boardId: number | undefined;
    @Input() config: any = {};

    viewDate: Date = new Date();
    calendarDays: any[] = [];
    loading = false;
    private destroy$ = new Subject<void>();

    constructor(
        private taskService: TaskService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    ngOnInit() {
        this.refreshView();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['boardId']) {
            this.refreshView();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    refreshView() {
        this.generateMonthView();
        this.fetchTasksForView();
    }

    generateMonthView() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Fill days with empty tasks initially
        this.calendarDays = [];
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);

            this.calendarDays.push({
                date: date,
                tasks: [],
                isToday: new Date().toDateString() === date.toDateString()
            });
        }
    }

    fetchTasksForView() {
        if (!this.boardId) return;

        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const formattedStart = start.toISOString().split('T')[0];
        const formattedEnd = end.toISOString().split('T')[0];

        this.loading = true;

        this.workspaceContextService.context$.pipe(
            takeUntil(this.destroy$),
            switchMap(context => {
                if (!context.currentTenant || !context.currentWorkspace || !this.boardId) {
                    return of({ data: [] });
                }

                // Use the new calendar params we added to TaskController
                const params: any = {
                    view: 'calendar',
                    start: formattedStart,
                    end: formattedEnd,
                    date_field: this.config?.date_field || 'due_date'
                };

                return this.taskService.getTasks(
                    parseInt(context.currentTenant.id),
                    parseInt(context.currentWorkspace.id),
                    this.boardId,
                    params as any,
                    undefined,
                    1,
                    500 // Max limit for calendar view
                );
            }),
            map((res: any) => res.data || [])
        ).subscribe({
            next: (tasks: Task[]) => {
                this.mapTasksToDays(tasks);
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load calendar tasks', err);
                this.loading = false;
            }
        });
    }

    mapTasksToDays(tasks: Task[]) {
        this.calendarDays.forEach(day => {
            day.tasks = tasks.filter(t => {
                // Default to due_date
                if (!t.due_date) return false;
                const tDate = new Date(t.due_date);
                return tDate.getDate() === day.date.getDate() &&
                    tDate.getMonth() === day.date.getMonth() &&
                    tDate.getFullYear() === day.date.getFullYear();
            });
        });
    }

    previousMonth() {
        this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
        this.refreshView();
    }

    nextMonth() {
        this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
        this.refreshView();
    }
}
