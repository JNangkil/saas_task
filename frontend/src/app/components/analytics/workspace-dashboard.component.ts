import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService, WorkspaceSummary, UserProductivity, ActivityTrend } from '../../services/analytics.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { AssigneeFilterComponent } from './assignee-filter.component';
import { BoardFilterComponent } from './board-filter.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-workspace-dashboard',
    templateUrl: './workspace-dashboard.component.html',
    styleUrls: ['./workspace-dashboard.component.css'],
    standalone: true,
    imports: [CommonModule, DecimalPipe, AssigneeFilterComponent, BoardFilterComponent, BaseChartDirective]
})
export class WorkspaceDashboardComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    workspace: IWorkspace | null = null;
    loading = true;
    error: string | null = null;

    // Analytics data
    summary: WorkspaceSummary | null = null;
    userProductivity: UserProductivity[] = [];
    activityTrends: ActivityTrend[] = [];

    // Filters
    startDate: string = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endDate: string = new Date().toISOString().split('T')[0];
    dateRangeFilter: '7' | '30' | '90' | 'custom' = '30';
    selectedAssignees: number[] = [];
    selectedBoards: number[] = [];

    // Chart data
    statusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
    priorityChartData: ChartData<'pie'> = { labels: [], datasets: [] };
    trendChartData: ChartData<'line'> = { labels: [], datasets: [] };

    // Chart options
    statusChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };
    priorityChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };
    trendChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };
    today: Date = new Date();

    constructor(
        private analyticsService: AnalyticsService,
        private workspaceContext: WorkspaceContextService
    ) { }

    ngOnInit(): void {
        this.workspaceContext.context$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(context => {
            this.workspace = context.currentWorkspace;
            if (context.currentWorkspace) {
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
            summary: this.analyticsService.getWorkspaceSummary(Number(this.workspace.id), filters),
            productivity: this.analyticsService.getUserProductivity(Number(this.workspace.id), filters),
            trends: this.analyticsService.getActivityTrends(Number(this.workspace.id), filters)
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
        const statusLabels = ['To Do', 'In Progress', 'Done', 'Blocked'];
        const statusValues = [
            this.summary.tasks_by_status.todo,
            this.summary.tasks_by_status.in_progress,
            this.summary.tasks_by_status.done,
            this.summary.tasks_by_status.blocked
        ];
        const statusColors = ['#94a3b8', '#3b82f6', '#22c55e', '#ef4444'];

        this.statusChartData = {
            labels: statusLabels,
            datasets: [{
                data: statusValues,
                backgroundColor: statusColors,
                hoverBackgroundColor: statusColors
            }]
        };

        // Priority distribution chart
        const priorityLabels = ['Low', 'Medium', 'High', 'Urgent'];
        const priorityValues = [
            this.summary.tasks_by_priority.low,
            this.summary.tasks_by_priority.medium,
            this.summary.tasks_by_priority.high,
            this.summary.tasks_by_priority.urgent
        ];
        const priorityColors = ['#94a3b8', '#f59e0b', '#f97316', '#dc2626'];

        this.priorityChartData = {
            labels: priorityLabels,
            datasets: [{
                data: priorityValues,
                backgroundColor: priorityColors,
                hoverBackgroundColor: priorityColors
            }]
        };

        // Activity trend chart
        const trendLabels = this.activityTrends.map(trend =>
            new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        const createdValues = this.activityTrends.map(trend => trend.created);
        const completedValues = this.activityTrends.map(trend => trend.completed);

        this.trendChartData = {
            labels: trendLabels,
            datasets: [
                {
                    label: 'Created',
                    data: createdValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Completed',
                    data: completedValues,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }

    onDateRangeChange(range: '7' | '30' | '90' | 'custom'): void {
        this.dateRangeFilter = range;

        const now = new Date();
        let start: Date;

        switch (range) {
            case '7':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'custom':
                return; // User will use date pickers
        }

        this.startDate = start.toISOString().split('T')[0];
        this.endDate = now.toISOString().split('T')[0];
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

        this.analyticsService.exportWorkspaceCsv(Number(this.workspace.id), filters).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-analytics-${this.workspace?.id}-${new Date().toISOString().split('T')[0]}.csv`;
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

        this.analyticsService.exportWorkspacePdf(Number(this.workspace.id), filters).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-analytics-${this.workspace?.id}-${new Date().toISOString().split('T')[0]}.pdf`;
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

        this.analyticsService.clearWorkspaceCache(Number(this.workspace.id)).subscribe({
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