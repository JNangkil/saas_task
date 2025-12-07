import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IWorkspace, IWorkspaceContext, IWorkspaceCreateRequest, IWorkspaceUpdateRequest, IWorkspaceMember } from '../interfaces/workspace.interface';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceService {
    private readonly apiUrl = '/api/workspaces';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    constructor(private http: HttpClient) { }

    /**
     * Get all workspaces for a tenant.
     */
    getWorkspaces(tenantId: string, includeArchived = false): Observable<IWorkspace[]> {
        const url = `${this.apiUrl}?tenant_id=${tenantId}&include_archived=${includeArchived}`;
        return this.http.get<IWorkspace[]>(url).pipe(
            map(response => response.data || []),
            catchError(error => {
                console.error('Error fetching workspaces:', error);
                return throwError(() => new Error('Failed to fetch workspaces'));
            })
        );
    }

    /**
     * Get workspaces for the current tenant.
     */
    getCurrentTenantWorkspaces(includeArchived = false): Observable<IWorkspace[]> {
        // This would get the current tenant from context service
        // For now, we'll implement this as a placeholder
        return this.http.get<IWorkspace[]>(`${this.apiUrl}?include_archived=${includeArchived}`).pipe(
            map(response => response.data || []),
            catchError(error => {
                console.error('Error fetching current tenant workspaces:', error);
                return throwError(() => new Error('Failed to fetch current tenant workspaces'));
            })
        );
    }

    /**
     * Get a specific workspace.
     */
    getWorkspace(tenantId: string, workspaceId: string): Observable<IWorkspace> {
        return this.http.get<IWorkspace>(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Create a new workspace.
     */
    createWorkspace(tenantId: string, workspaceData: IWorkspaceCreateRequest): Observable<IWorkspace> {
        return this.http.post<IWorkspace>(`${this.apiUrl}?tenant_id=${tenantId}`, workspaceData, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Error creating workspace:', error);
                return throwError(() => new Error('Failed to create workspace'));
            })
        );
    }

    /**
     * Update an existing workspace.
     */
    updateWorkspace(tenantId: string, workspaceId: string, workspaceData: IWorkspaceUpdateRequest): Observable<IWorkspace> {
        return this.http.put<IWorkspace>(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}`, workspaceData, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to update workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Archive a workspace.
     */
    archiveWorkspace(tenantId: string, workspaceId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/archive`).pipe(
            catchError(error => {
                console.error(`Error archiving workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to archive workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Restore a workspace.
     */
    restoreWorkspace(tenantId: string, workspaceId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/restore`).pipe(
            catchError(error => {
                console.error(`Error restoring workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to restore workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Delete a workspace.
     */
    deleteWorkspace(tenantId: string, workspaceId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}`).pipe(
            catchError(error => {
                console.error(`Error deleting workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to delete workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Get workspace members.
     */
    getWorkspaceMembers(tenantId: string, workspaceId: string): Observable<IWorkspaceMember[]> {
        return this.http.get<IWorkspaceMember[]>(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/members`).pipe(
            map(response => response.data || []),
            catchError(error => {
                console.error(`Error fetching workspace members for ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch workspace members for ${workspaceId}`));
            })
        );
    }

    /**
     * Add a member to a workspace.
     */
    addWorkspaceMember(tenantId: string, workspaceId: string, memberData: { email: string; role: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/members`, memberData).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error adding member to workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to add member to workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Update a member's role in a workspace.
     */
    updateWorkspaceMemberRole(tenantId: string, workspaceId: string, userId: string, role: string): Observable<any> {
        return this.http.put(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/members/${userId}`, { role }).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating member role in workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to update member role in workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Remove a member from a workspace.
     */
    removeWorkspaceMember(tenantId: string, workspaceId: string, userId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/members/${userId}`).pipe(
            catchError(error => {
                console.error(`Error removing member from workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to remove member from workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Get workspace settings.
     */
    getWorkspaceSettings(tenantId: string, workspaceId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/settings`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching workspace settings for ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch workspace settings for ${workspaceId}`));
            })
        );
    }

    /**
     * Update workspace settings.
     */
    updateWorkspaceSettings(tenantId: string, workspaceId: string, settings: any): Observable<any> {
        return this.http.put(`${this.apiUrl}?tenant_id=${tenantId}&id=${workspaceId}/settings`, settings).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating workspace settings for ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to update workspace settings for ${workspaceId}`));
            })
        );
    }
}