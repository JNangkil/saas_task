import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface IActivity {
    id: number;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar_url?: string;
    };
    action: string;
    description?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    icon: string;
    color: string;
    subject_type: string;
    subject_id: number;
    created_at: string;
    created_at_human: string;
}

export interface IActivityListResponse {
    data: IActivity[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface IActivityFilters {
    user_id?: number;
    action?: string;
    subject_type?: string;
    date_from?: string;
    date_to?: string;
    workspace_id?: number;
    page?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ActivityService {
    private readonly endpoint = 'activity';

    constructor(private apiService: ApiService) {}

    /**
     * Get recent activity for dashboard
     */
    getRecentActivity(limit: number = 10, workspaceId?: number): Observable<IActivity[]> {
        const params: any = { limit };
        if (workspaceId) {
            params.workspace_id = workspaceId;
        }

        return this.apiService.get<{ data: IActivity[] }>(`${this.endpoint}/recent`, params).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Error fetching recent activity:', error);
                return of([]);
            })
        );
    }

    /**
     * Get tenant activity with filters
     */
    getTenantActivity(filters?: IActivityFilters): Observable<IActivityListResponse> {
        return this.apiService.get<IActivityListResponse>(`${this.endpoint}/tenant`, filters).pipe(
            catchError(error => {
                console.error('Error fetching tenant activity:', error);
                return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
            })
        );
    }

    /**
     * Get activity for a specific task
     */
    getTaskActivity(taskId: number, filters?: IActivityFilters): Observable<IActivityListResponse> {
        return this.apiService.get<IActivityListResponse>(`tasks/${taskId}/activity`, filters).pipe(
            catchError(error => {
                console.error('Error fetching task activity:', error);
                return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
            })
        );
    }

    /**
     * Get activity for a specific board
     */
    getBoardActivity(boardId: number, filters?: IActivityFilters): Observable<IActivityListResponse> {
        return this.apiService.get<IActivityListResponse>(`boards/${boardId}/activity`, filters).pipe(
            catchError(error => {
                console.error('Error fetching board activity:', error);
                return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
            })
        );
    }

    /**
     * Get activity for a specific workspace
     */
    getWorkspaceActivity(workspaceId: number, filters?: IActivityFilters): Observable<IActivityListResponse> {
        return this.apiService.get<IActivityListResponse>(`workspaces/${workspaceId}/activity`, filters).pipe(
            catchError(error => {
                console.error('Error fetching workspace activity:', error);
                return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
            })
        );
    }

    /**
     * Get formatted activity description with changes highlighted
     */
    formatActivityDescription(activity: IActivity): string {
        if (activity.description) {
            return activity.description;
        }

        // Fallback to generated description
        const subject = activity.subject_type.toLowerCase();
        const action = activity.action.toLowerCase();

        switch (action) {
            case 'created':
                return `Created ${subject}`;
            case 'updated':
                return `Updated ${subject}`;
            case 'deleted':
                return `Deleted ${subject}`;
            case 'assigned':
                return `Assigned ${subject}`;
            case 'unassigned':
                return `Unassigned ${subject}`;
            case 'commented':
                return `Commented on ${subject}`;
            case 'archived':
                return `Archived ${subject}`;
            case 'restored':
                return `Restored ${subject}`;
            default:
                return `${action} ${subject}`;
        }
    }

    /**
     * Format changes into readable text
     */
    formatChanges(changes: Record<string, any>): string[] {
        if (!changes) return [];

        const formattedChanges: string[] = [];

        for (const [field, change] of Object.entries(changes)) {
            if (typeof change === 'object' && change !== null) {
                const oldVal = change.old;
                const newVal = change.new;

                if (oldVal !== newVal) {
                    const fieldLabel = this.formatFieldName(field);
                    if (oldVal === undefined || oldVal === null) {
                        formattedChanges.push(`Set ${fieldLabel} to "${newVal}"`);
                    } else if (newVal === undefined || newVal === null) {
                        formattedChanges.push(`Removed ${fieldLabel}`);
                    } else {
                        formattedChanges.push(`Changed ${fieldLabel} from "${oldVal}" to "${newVal}"`);
                    }
                }
            }
        }

        return formattedChanges;
    }

    /**
     * Format field name for display
     */
    private formatFieldName(fieldName: string): string {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get activity icon class based on action
     */
    getActivityIconClass(activity: IActivity): string {
        return activity.icon || 'bi-circle';
    }

    /**
     * Get activity color class based on action
     */
    getActivityColorClass(activity: IActivity): string {
        return activity.color || 'secondary';
    }
}