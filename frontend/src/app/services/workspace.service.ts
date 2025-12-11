import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IWorkspace, IWorkspaceContext, IWorkspaceCreateRequest, IWorkspaceUpdateRequest, IWorkspaceMember } from '../interfaces/workspace.interface';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceService {
    constructor(private apiService: ApiService) { }

    /**
     * Get all workspaces for a tenant.
     */
    getWorkspaces(tenantId: string, includeArchived = false): Observable<IWorkspace[]> {
        const endpoint = `tenants/${tenantId}/workspaces${includeArchived ? '?include_archived=true' : ''}`;
        return this.apiService.get<any>(endpoint).pipe(
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
        const endpoint = `workspaces${includeArchived ? '?include_archived=true' : ''}`;
        return this.apiService.get<any>(endpoint).pipe(
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
    getWorkspace(workspaceId: string): Observable<IWorkspace> {
        return this.apiService.get<any>(`workspaces/${workspaceId}`).pipe(
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
        return this.apiService.post<any>(`tenants/${tenantId}/workspaces`, workspaceData).pipe(
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
    updateWorkspace(workspaceId: string, workspaceData: IWorkspaceUpdateRequest): Observable<IWorkspace> {
        return this.apiService.put<any>(`workspaces/${workspaceId}`, workspaceData).pipe(
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
    archiveWorkspace(workspaceId: string): Observable<any> {
        return this.apiService.post<any>(`workspaces/${workspaceId}/archive`, {}).pipe(
            catchError(error => {
                console.error(`Error archiving workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to archive workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Restore a workspace.
     */
    restoreWorkspace(workspaceId: string): Observable<any> {
        return this.apiService.post<any>(`workspaces/${workspaceId}/restore`, {}).pipe(
            catchError(error => {
                console.error(`Error restoring workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to restore workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Delete a workspace.
     */
    deleteWorkspace(workspaceId: string): Observable<any> {
        return this.apiService.delete<any>(`workspaces/${workspaceId}`).pipe(
            catchError(error => {
                console.error(`Error deleting workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to delete workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Get workspace members.
     */
    getWorkspaceMembers(workspaceId: string): Observable<IWorkspaceMember[]> {
        return this.apiService.get<any>(`workspaces/${workspaceId}/members`).pipe(
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
    addWorkspaceMember(workspaceId: string, memberData: { email: string; role: string }): Observable<any> {
        return this.apiService.post<any>(`workspaces/${workspaceId}/members`, memberData).pipe(
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
    updateWorkspaceMemberRole(workspaceId: string, userId: string, role: string): Observable<any> {
        return this.apiService.put<any>(`workspaces/${workspaceId}/members/${userId}`, { role }).pipe(
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
    removeWorkspaceMember(workspaceId: string, userId: string): Observable<any> {
        return this.apiService.delete<any>(`workspaces/${workspaceId}/members/${userId}`).pipe(
            catchError(error => {
                console.error(`Error removing member from workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to remove member from workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Get workspace settings.
     */
    getWorkspaceSettings(workspaceId: string): Observable<any> {
        return this.apiService.get<any>(`workspaces/${workspaceId}/settings`).pipe(
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
    updateWorkspaceSettings(workspaceId: string, settings: any): Observable<any> {
        return this.apiService.put<any>(`workspaces/${workspaceId}/settings`, settings).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating workspace settings for ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to update workspace settings for ${workspaceId}`));
            })
        );
    }
}