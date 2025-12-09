import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService, BoardSummary, AnalyticsFilters } from '../../services/analytics.service';
import { Board, Workspace, Tenant } from '../../models';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { TenantService } from '../../services/tenant.service';

@Component({
    selector: 'app-board-stats',
    templateUrl: './board-stats.component.html',
    styleUrls: ['./board-stats.component.css'],
    standalone: true
})
export class BoardStatsComponent implements OnInit, OnDestroy, OnChanges {
    private destroy$ = new Subject<void>();

    @Input() board: Board | null = null;
    @Input() compact = false; // Compact mode for board header

    currentWorkspace: Workspace | null = null;
    currentTenant: Tenant | null = null;
    loading = false;
    summary: BoardSummary | null = null;

    // Filters
    filters: AnalyticsFilters = {};

    constructor(
        private analyticsService: AnalyticsService,
        private workspaceContext: WorkspaceContextService,
        private tenantService: TenantService
    ) { }

    ngOnInit(): void {
        this.workspaceContext.currentWorkspace$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(workspace => {
            this.currentWorkspace = workspace;
            if (this.board) {
                this.loadBoardStats();
            }
        });

        this.tenantService.currentTenant$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(tenant => {
            this.currentTenant = tenant;
            if (this.board) {
                this.loadBoardStats();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnChanges(): void {
        if (this.board) {
            this.loadBoardStats();
        }
    }

    loadBoardStats(): void {
        if (!this.board || !this.currentWorkspace || !this.currentTenant) return;

        this.loading = true;

        this.analyticsService.getBoardSummary(
            this.board.id,
            this.currentTenant.id,
            this.currentWorkspace.id,
            this.filters
        ).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (summary) => {
                this.summary = summary;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading board stats:', error);
                this.loading = false;
            }
        });
    }

    refreshStats(): void {
        this.loadBoardStats();
    }

    clearCache(): void {
        if (!this.board || !this.currentWorkspace || !this.currentTenant) return;

        this.analyticsService.clearBoardCache(
            this.board.id,
            this.currentTenant.id,
            this.currentWorkspace.id
        ).subscribe({
            next: () => {
                this.refreshStats();
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

    getCompletionRateIcon(): string {
        if (!this.summary) return 'fas fa-minus-circle';
        const rate = this.summary.completion_rate;
        if (rate >= 80) return 'fas fa-check-circle';
        if (rate >= 60) return 'fas fa-exclamation-circle';
        return 'fas fa-times-circle';
    }

    getOverdueColor(): string {
        if (!this.summary) return '';
        return this.summary.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600';
    }

    getOverdueIcon(): string {
        if (!this.summary) return 'fas fa-minus-circle';
        return this.summary.overdue_tasks > 0 ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
    }

    // Format cycle time for display
    formatCycleTime(days: number): string {
        if (days < 1) {
            return '< 1 day';
        }
        return days === 1 ? '1 day' : `${days} days`;
    }

    // Get percentage for progress bars
    getCompletionPercentage(): number {
        if (!this.summary || this.summary.total_tasks === 0) return 0;
        return Math.round((this.summary.completed_tasks / this.summary.total_tasks) * 100);
    }

    getInProgressPercentage(): number {
        if (!this.summary || this.summary.total_tasks === 0) return 0;
        return Math.round((this.summary.in_progress_tasks / this.summary.total_tasks) * 100);
    }

    getPendingPercentage(): number {
        if (!this.summary || this.summary.total_tasks === 0) return 0;
        return Math.round((this.summary.pending_tasks / this.summary.total_tasks) * 100);
    }
}