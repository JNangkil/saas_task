import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Workspace, Board, User } from '../models';

export interface WorkspaceSummary {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
    average_cycle_time: number;
    tasks_by_priority: {
        low: number;
        medium: number;
        high: number;
        urgent: number;
    };
    tasks_by_status: {
        todo: number;
        in_progress: number;
        done: number;
        blocked: number;
    };
}

export interface BoardSummary {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
    average_cycle_time: number;
}

export interface UserProductivity {
    user: {
        id: number;
        name: string;
        email: string;
    };
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    average_cycle_time: number;
}

export interface ActivityTrend {
    date: string;
    created: number;
    completed: number;
}

export interface AnalyticsFilters {
    start_date?: string;
    end_date?: string;
}

/**
 * Service for fetching analytics data
 */
@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly baseUrl = '/api';

    constructor(
        private http: HttpClient,
        private apiService: ApiService
    ) { }

    /**
     * Get workspace analytics summary
     *
     * @param workspaceId The workspace ID
     * @param filters Optional date range filters
     * @returns Observable<WorkspaceSummary>
     */
    getWorkspaceSummary(workspaceId: number, filters?: AnalyticsFilters): Observable<WorkspaceSummary> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get<WorkspaceSummary>(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/summary`,
            { params }
        );
    }

    /**
     * Get board analytics summary
     *
     * @param boardId The board ID
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param filters Optional date range filters
     * @returns Observable<BoardSummary>
     */
    getBoardSummary(boardId: number, tenantId: number, workspaceId: number, filters?: AnalyticsFilters): Observable<BoardSummary> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get<BoardSummary>(
            `${this.baseUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/analytics/summary`,
            { params }
        );
    }

    /**
     * Get user productivity analytics for a workspace
     *
     * @param workspaceId The workspace ID
     * @param filters Optional date range filters
     * @returns Observable<UserProductivity[]>
     */
    getUserProductivity(workspaceId: number, filters?: AnalyticsFilters): Observable<UserProductivity[]> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get<UserProductivity[]>(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/user-productivity`,
            { params }
        );
    }

    /**
     * Get activity trends for a workspace
     *
     * @param workspaceId The workspace ID
     * @param filters Date range filters (required)
     * @returns Observable<ActivityTrend[]>
     */
    getActivityTrends(workspaceId: number, filters: Required<AnalyticsFilters>): Observable<ActivityTrend[]> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get<ActivityTrend[]>(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/trends`,
            { params }
        );
    }

    /**
     * Export workspace analytics to CSV
     *
     * @param workspaceId The workspace ID
     * @param filters Optional date range filters
     * @returns Observable<Blob>
     */
    exportWorkspaceCsv(workspaceId: number, filters?: AnalyticsFilters): Observable<Blob> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/export/csv`,
            {
                params,
                responseType: 'blob'
            }
        );
    }

    /**
     * Export workspace analytics to PDF
     *
     * @param workspaceId The workspace ID
     * @param filters Optional date range filters
     * @returns Observable<Blob>
     */
    exportWorkspacePdf(workspaceId: number, filters?: AnalyticsFilters): Observable<Blob> {
        const params = this.apiService.buildHttpParams(filters);
        return this.http.get(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/export/pdf`,
            {
                params,
                responseType: 'blob'
            }
        );
    }

    /**
     * Clear analytics cache for a workspace
     *
     * @param workspaceId The workspace ID
     * @returns Observable<any>
     */
    clearWorkspaceCache(workspaceId: number): Observable<any> {
        return this.http.delete(
            `${this.baseUrl}/workspaces/${workspaceId}/analytics/cache`
        );
    }

    /**
     * Clear analytics cache for a board
     *
     * @param boardId The board ID
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @returns Observable<any>
     */
    clearBoardCache(boardId: number, tenantId: number, workspaceId: number): Observable<any> {
        return this.http.delete(
            `${this.baseUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/analytics/cache`
        );
    }
}