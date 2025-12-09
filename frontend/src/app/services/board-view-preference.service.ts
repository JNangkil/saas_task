import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface ViewPreference {
    id?: string;
    preferred_view: 'table' | 'kanban' | 'calendar';
    kanban_config?: {
        group_by?: string;
        column_order?: string[];
        collapsed_columns?: string[];
    };
    calendar_config?: {
        mode?: 'month' | 'week' | 'day';
        date_field?: 'due_date' | 'start_date';
    };
    filters?: any;
}

@Injectable({
    providedIn: 'root'
})
export class BoardViewPreferenceService {
    private apiUrl = '/api/tenants';
    private preferencesCache = new Map<string, ViewPreference>();
    private currentPreferenceSubject = new BehaviorSubject<ViewPreference | null>(null);

    public currentPreference$ = this.currentPreferenceSubject.asObservable();

    constructor(private http: HttpClient) { }

    getPreferences(tenantId: string, workspaceId: string, boardId: string): Observable<ViewPreference> {
        const cacheKey = `${tenantId}:${workspaceId}:${boardId}`;

        if (this.preferencesCache.has(cacheKey)) {
            const pref = this.preferencesCache.get(cacheKey)!;
            this.currentPreferenceSubject.next(pref);
            return of(pref);
        }

        return this.http.get<ViewPreference>(
            `${this.apiUrl}/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/view-preferences`
        ).pipe(
            tap(pref => {
                this.preferencesCache.set(cacheKey, pref);
                this.currentPreferenceSubject.next(pref);
            })
        );
    }

    updatePreferences(
        tenantId: string,
        workspaceId: string,
        boardId: string,
        changes: Partial<ViewPreference>
    ): Observable<ViewPreference> {
        const cacheKey = `${tenantId}:${workspaceId}:${boardId}`;

        // Optimistic update
        const current = this.preferencesCache.get(cacheKey) || this.currentPreferenceSubject.value || { preferred_view: 'table' };
        const updated = { ...current, ...changes };

        this.preferencesCache.set(cacheKey, updated);
        this.currentPreferenceSubject.next(updated);

        return this.http.put<ViewPreference>(
            `${this.apiUrl}/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/view-preferences`,
            changes
        ).pipe(
            tap(pref => {
                this.preferencesCache.set(cacheKey, pref);
                this.currentPreferenceSubject.next(pref);
            }),
            catchError(err => {
                // Rollback on error
                this.preferencesCache.set(cacheKey, current);
                this.currentPreferenceSubject.next(current);
                throw err;
            })
        );
    }

    setCurrentView(tenantId: string, workspaceId: string, boardId: string, view: 'table' | 'kanban' | 'calendar') {
        return this.updatePreferences(tenantId, workspaceId, boardId, { preferred_view: view });
    }
}
