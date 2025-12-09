import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IActivity, ActivityService, IActivityFilters, IActivityListResponse } from '../../services/activity.service';
import { WorkspaceService } from '../../services/workspace.service';
import { Workspace } from '../../models/workspace.model';

@Component({
    selector: 'app-activity-feed',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './activity-feed.component.html',
    styleUrls: ['./activity-feed.component.scss']
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    @Input() type: 'workspace' | 'board' | 'tenant' | 'recent' = 'recent';
    @Input() entityId: number | null = null;
    @Input() limit: number = 20;
    @Input() showFilters: boolean = true;
    @Input() showSearch: boolean = true;
    @Input() infiniteScroll: boolean = true;
    @Input() compact: boolean = false;

    activities: IActivity[] = [];
    isLoading = false;
    error: string | null = null;
    currentPage = 1;
    lastPage = 1;
    hasMore = true;
    totalActivities = 0;

    filters: IActivityFilters = {
        page: 1
    };

    searchQuery = '';
    workspaces: Workspace[] = [];
    selectedWorkspaceId: number | null = null;

    // Available action filters
    actionFilters = [
        { value: '', label: 'All Actions' },
        { value: 'created', label: 'Created' },
        { value: 'updated', label: 'Updated' },
        { value: 'deleted', label: 'Deleted' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'commented', label: 'Commented' },
        { value: 'archived', label: 'Archived' },
        { value: 'restored', label: 'Restored' }
    ];

    // Subject type filters
    subjectTypeFilters = [
        { value: '', label: 'All Types' },
        { value: 'Task', label: 'Tasks' },
        { value: 'Board', label: 'Boards' },
        { value: 'Column', label: 'Columns' },
        { value: 'Comment', label: 'Comments' }
    ];

    constructor(
        private activityService: ActivityService,
        private workspaceService: WorkspaceService,
        private cdr: ChangeDetectorRef
    ) {
        // Setup search debouncing
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(query => {
            this.searchQuery = query;
            this.applyFilters();
        });
    }

    ngOnInit(): void {
        if (this.type === 'recent') {
            this.loadRecentActivity();
        } else if (this.entityId) {
            this.loadActivities();
        }

        // Load workspaces for filter
        if (this.type === 'tenant' || this.type === 'recent') {
            this.loadWorkspaces();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load activities based on type
     */
    loadActivities(append: boolean = false): void {
        if (!this.entityId || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.error = null;

        this.filters.page = append ? this.currentPage + 1 : 1;

        let observable$: Observable<IActivityListResponse>;

        switch (this.type) {
            case 'task':
                observable$ = this.activityService.getTaskActivity(this.entityId, this.filters);
                break;
            case 'board':
                observable$ = this.activityService.getBoardActivity(this.entityId, this.filters);
                break;
            case 'workspace':
                observable$ = this.activityService.getWorkspaceActivity(this.entityId, this.filters);
                break;
            case 'tenant':
                observable$ = this.activityService.getTenantActivity(this.filters);
                break;
            default:
                observable$ = of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
        }

        observable$.pipe(
            takeUntil(this.destroy$),
            catchError(error => {
                console.error('Error loading activity:', error);
                this.error = 'Failed to load activity. Please try again.';
                this.isLoading = false;
                this.cdr.detectChanges();
                return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } } as IActivityListResponse);
            })
        ).subscribe(response => {
            if (append) {
                this.activities = [...this.activities, ...response.data];
            } else {
                this.activities = response.data;
            }

            this.currentPage = response.meta.current_page;
            this.lastPage = response.meta.last_page;
            this.totalActivities = response.meta.total;
            this.hasMore = this.currentPage < this.lastPage;
            this.isLoading = false;

            this.cdr.detectChanges();
        });
    }

    /**
     * Load recent activity for dashboard
     */
    loadRecentActivity(): void {
        this.isLoading = true;
        this.error = null;

        this.activityService.getRecentActivity(this.limit, this.selectedWorkspaceId || undefined)
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading recent activity:', error);
                    this.error = 'Failed to load recent activity.';
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    return of([]);
                })
            )
            .subscribe(activities => {
                this.activities = activities;
                this.totalActivities = activities.length;
                this.hasMore = false;
                this.isLoading = false;

                this.cdr.detectChanges();
            });
    }

    /**
     * Load user's workspaces
     */
    private loadWorkspaces(): void {
        this.workspaceService.getWorkspaces()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading workspaces:', error);
                    return of([]);
                })
            )
            .subscribe(response => {
                this.workspaces = response.data || response;
                this.cdr.detectChanges();
            });
    }

    /**
     * Load more activities
     */
    loadMore(): void {
        if (this.hasMore && !this.isLoading && this.infiniteScroll) {
            if (this.type === 'recent') {
                this.limit += 20;
                this.loadRecentActivity();
            } else {
                this.loadActivities(true);
            }
        }
    }

    /**
     * Handle search input
     */
    onSearchChange(query: string): void {
        this.searchSubject.next(query);
    }

    /**
     * Apply filters
     */
    applyFilters(): void {
        // Reset page number when applying new filters
        this.currentPage = 1;
        this.hasMore = true;

        if (this.searchQuery) {
            // Note: Backend doesn't support search yet, this is just for UI
            // In a real implementation, you'd add search parameter to API
        }

        if (this.type === 'recent') {
            this.loadRecentActivity();
        } else {
            this.loadActivities();
        }
    }

    /**
     * Clear all filters
     */
    clearFilters(): void {
        this.filters = {
            page: 1
        };
        this.searchQuery = '';
        this.selectedWorkspaceId = null;
        this.applyFilters();
    }

    /**
     * Get avatar URL or default
     */
    getAvatarUrl(user?: any): string {
        if (!user) {
            return 'assets/images/default-avatar.png';
        }
        return user.avatar_url || 'assets/images/default-avatar.png';
    }

    /**
     * Get formatted changes for display
     */
    getFormattedChanges(activity: IActivity): string[] {
        return this.activityService.formatChanges(activity.changes || {});
    }

    /**
     * Get activity icon class
     */
    getActivityIcon(activity: IActivity): string {
        return this.activityService.getActivityIconClass(activity);
    }

    /**
     * Get activity color class
     */
    getActivityColor(activity: IActivity): string {
        return this.activityService.getActivityColorClass(activity);
    }

    /**
     * Track activity by ID for ngFor
     */
    trackByActivityId(index: number, activity: IActivity): number {
        return activity.id;
    }

    /**
     * Handle workspace filter change
     */
    onWorkspaceChange(workspaceId: number | null): void {
        this.selectedWorkspaceId = workspaceId;
        if (workspaceId) {
            this.filters.workspace_id = workspaceId;
        } else {
            delete this.filters.workspace_id;
        }
        this.applyFilters();
    }

    /**
     * Handle action filter change
     */
    onActionFilterChange(action: string): void {
        if (!action) {
            delete this.filters.action;
        } else {
            this.filters.action = action;
        }
        this.applyFilters();
    }

    /**
     * Handle subject type filter change
     */
    onSubjectTypeFilterChange(subjectType: string): void {
        if (!subjectType) {
            delete this.filters.subject_type;
        } else {
            this.filters.subject_type = subjectType;
        }
        this.applyFilters();
    }

    /**
     * Handle date range filter change
     */
    onDateRangeChange(): void {
        if (!this.filters.date_from) {
            delete this.filters.date_from;
        }
        if (!this.filters.date_to) {
            delete this.filters.date_to;
        }
        this.applyFilters();
    }

    /**
     * Get relative time string
     */
    getRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }

        // For older dates, show the actual date
        return date.toLocaleDateString();
    }
}