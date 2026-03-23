import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { IActivity, ActivityService, IActivityFilters, IActivityListResponse } from '../../services/activity.service';
import { ApiService } from '../../services/api.service';
import { User } from '../../models/user.model';

@Component({
    selector: 'app-task-activity',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './task-activity.component.html',
    styleUrls: ['./task-activity.component.scss']
})
export class TaskActivityComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    @Input() taskId: number | null = null;

    activities: IActivity[] = [];
    isLoading = false;
    error: string | null = null;
    currentPage = 1;
    lastPage = 1;
    hasMore = false;
    totalActivities = 0;

    filters: IActivityFilters = {
        page: 1
    };

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

    // Available user filters (will be populated from activities)
    userFilters: { value: number, label: string }[] = [];

    constructor(
        public activityService: ActivityService, // Made public for template access
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        if (this.taskId) {
            this.loadActivities();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load activities for the task
     */
    loadActivities(append: boolean = false): void {
        if (!this.taskId || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.error = null;

        this.filters.page = append ? this.currentPage + 1 : 1;

        this.activityService.getTaskActivity(this.taskId, this.filters)
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading task activity:', error);
                    this.error = 'Failed to load activity. Please try again.';
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } } as IActivityListResponse);
                })
            )
            .subscribe(response => {
                if (append) {
                    this.activities = [...this.activities, ...response.data];
                } else {
                    this.activities = response.data;
                    this.extractUniqueUsers(response.data);
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
     * Extract unique users from activities for filter dropdown
     */
    private extractUniqueUsers(activities: IActivity[]): void {
        const uniqueUsers = new Map<number, string>();

        activities.forEach(activity => {
            if (activity.user) {
                uniqueUsers.set(activity.user.id, activity.user.name);
            }
        });

        this.userFilters = [
            { value: 0, label: 'All Users' },
            ...Array.from(uniqueUsers.entries()).map(([id, name]) => ({
                value: id,
                label: name
            }))
        ];
    }

    /**
     * Load more activities
     */
    loadMore(): void {
        if (this.hasMore && !this.isLoading) {
            this.loadActivities(true);
        }
    }

    /**
     * Apply filters
     */
    applyFilters(): void {
        // Reset page number when applying new filters
        this.currentPage = 1;
        this.hasMore = true;
        this.loadActivities();
    }

    /**
     * Clear all filters
     */
    clearFilters(): void {
        this.filters = {
            page: 1
        };
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
     * Track change by index for ngFor
     */
    trackByChangeIndex(index: number, change: string): number {
        return index;
    }

    /**
     * Handle user filter change
     */
    onUserFilterChange(userId: number): void {
        if (userId === 0) {
            delete this.filters.user_id;
        } else {
            this.filters.user_id = userId;
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