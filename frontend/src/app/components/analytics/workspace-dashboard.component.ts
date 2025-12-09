import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService, WorkspaceSummary, UserProductivity, ActivityTrend } from '../../services/analytics.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { Workspace } from '../../models';
import * as moment from 'moment';
import { AssigneeFilterComponent } from './assignee-filter.component';
import { BoardFilterComponent } from './board-filter.component';

@Component({
    selector: 'app-workspace-dashboard',
    templateUrl: './workspace-dashboard.component.html',
    styleUrls: ['./workspace-dashboard.component.css'],
    standalone: true,
    imports: [AssigneeFilterComponent, BoardFilterComponent]
})
export class WorkspaceDashboardComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    workspace: Workspace | null = null;
    loading = true;
    error: string | null = null;

    // Analytics data
    summary: WorkspaceSummary | null = null;
    userProductivity: UserProductivity[] = [];
    activityTrends: ActivityTrend[] = [];

    // Filters
    startDate: string = moment().subtract(30, 'days').format('YYYY-MM-DD');
    endDate: string = moment().format('YYYY-MM-DD');
    dateRangeFilter: '7' | '30' | '90' | 'custom' = '30';
    selectedAssignees: number[] = [];
    selectedBoards: number[] = [];

    // Chart data
    statusChartData: any[] = [];
    priorityChartData: any[] = [];
    trendChartData: any[] = [];

    constructor(
        private analyticsService: AnalyticsService,
        private workspaceContext: WorkspaceContextService
    ) { }

    ngOnInit(): void {
        this.workspaceContext.currentWorkspace$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(workspace => {
            this.workspace = workspace;
            if (workspace) {
                this.loadAnalytics();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadAnalytics(): void {
        if (!this.workspace) return;

        this.loading = true;
        this.error = null;

        const filters = {
            start_date: this.startDate,
            end_date: this.endDate
        };

        forkJoin({
            summary: this.analyticsService.getWorkspaceSummary(this.workspace.id, filters),
            productivity: this.analyticsService.getUserProductivity(this.workspace.id, filters),
            trends: this.analyticsService.getActivityTrends(this.workspace.id, filters)
        }).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (data) => {
                this.summary = data.summary;
                this.userProductivity = data.productivity;
                this.activityTrends = data.trends;
                this.prepareChartData();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading analytics:', error);
                this.error = 'Failed to load analytics data';
                this.loading = false;
            }
        });
    }

    prepareChartData(): void {
        if (!this.summary) return;

        // Status distribution chart
        this.statusChartData = [
            { name: 'To Do', value: this.summary.tasks_by_status.todo, color: '#94a3b8' },
            { name: 'In Progress', value: this.summary.tasks_by_status.in_progress, color: '#3b82f6' },
            { name: 'Done', value: this.summary.tasks_by_status.done, color: '#22c55e' },
            { name: 'Blocked', value: this.summary.tasks_by_status.blocked, color: '#ef4444' }
        ];

        // Priority distribution chart
        this.priorityChartData = [
            { name: 'Low', value: this.summary.tasks_by_priority.low, color: '#94a3b8' },
            { name: 'Medium', value: this.summary.tasks_by_priority.medium, color: '#f59e0b' },
            { name: 'High', value: this.summary.tasks_by_priority.high, color: '#f97316' },
            { name: 'Urgent', value: this.summary.tasks_by_priority.urgent, color: '#dc2626' }
        ];

        // Activity trend chart
        this.trendChartData = this.activityTrends.map(trend => ({
            date: moment(trend.date).format('MMM DD'),
            created: trend.created,
            completed: trend.completed
        }));
    }

    onDateRangeChange(range: '7' | '30' | '90' | 'custom'): void {
        this.dateRangeFilter = range;

        const now = moment();
        let start: moment.Moment;

        switch (range) {
            case '7':
                start = now.clone().subtract(7, 'days');
                break;
            case '30':
                start = now.clone().subtract(30, 'days');
                break;
            case '90':
                start = now.clone().subtract(90, 'days');
                break;
            case 'custom':
                return; // User will use date pickers
        }

        this.startDate = start.format('YYYY-MM-DD');
        this.endDate = now.format('YYYY-MM-DD');
        this.loadAnalytics();
    }

    onStartDateChange(date: string): void {
        this.startDate = date;
        if (this.dateRangeFilter !== 'custom') {
            this.dateRangeFilter = 'custom';
        }
        this.loadAnalytics();
    }

    onEndDateChange(date: string): void {
        this.endDate = date;
        if (this.dateRangeFilter !== 'custom') {
            this.dateRangeFilter = 'custom';
        }
        this.loadAnalytics();
    }

    exportCsv(): void {
        if (!this.workspace) return;

        const filters = {
            start_date: this.startDate,
            end_date: this.endDate
        };

        this.analyticsService.exportWorkspaceCsv(this.workspace.id, filters).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-analytics-${this.workspace?.id}-${moment().format('YYYY-MM-DD')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, error => {
            console.error('Error exporting CSV:', error);
        });
    }

    exportPdf(): void {
        if (!this.workspace) return;

        const filters = {
            start_date: this.startDate,
            end_date: this.endDate
        };

        this.analyticsService.exportWorkspacePdf(this.workspace.id, filters).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-analytics-${this.workspace?.id}-${moment().format('YYYY-MM-DD')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, error => {
            console.error('Error exporting PDF:', error);
        });
    }

    refreshData(): void {
        this.loadAnalytics();
    }

    onFiltersChange(): void {
        this.loadAnalytics();
    }

    clearCache(): void {
        if (!this.workspace) return;

        this.analyticsService.clearWorkspaceCache(this.workspace.id).subscribe({
            next: () => {
                this.refreshData();
            },
            error: (error) => {
                console.error('Error clearing cache:', error);
            }
        });
    }

    getCompletionRateColor(): string {
        if (!this.summary) return '';
        const rate = this.summary.completion_rate;
        if (rate >= 80) return 'text-green-600';
        if (rate >= 60) return 'text-yellow-600';
        return 'text-red-600';
    }

    getOverdueTasksColor(): string {
        if (!this.summary) return '';
        return this.summary.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600';
    }
}