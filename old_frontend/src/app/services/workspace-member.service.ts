import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
    IWorkspaceMember,
    IRoleUpdate,
    IOwnershipTransfer,
    IUserPermissions,
    IMemberListResponse
} from '../interfaces/workspace-member.interface';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceMemberService {
    private readonly apiUrl = '/api/workspaces';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    constructor(private http: HttpClient) { }

    /**
     * Get all members of a workspace.
     */
    getMembers(workspaceId: number): Observable<IMemberListResponse> {
        return this.http.get<any>(`/api/workspaces/${workspaceId}/members`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching members for workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch members for workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Update a member's role in a workspace.
     */
    updateMemberRole(workspaceId: number, userId: number, role: string): Observable<IWorkspaceMember> {
        const roleUpdate: IRoleUpdate = { role: role as 'admin' | 'member' | 'viewer' };
        return this.http.patch<any>(`/api/workspaces/${workspaceId}/members/${userId}`, roleUpdate, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating member role for user ${userId} in workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to update member role for user ${userId} in workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Remove a member from a workspace.
     */
    removeMember(workspaceId: number, userId: number): Observable<any> {
        return this.http.delete<any>(`/api/workspaces/${workspaceId}/members/${userId}`).pipe(
            catchError(error => {
                console.error(`Error removing member ${userId} from workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to remove member ${userId} from workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Get user permissions for a workspace.
     */
    getPermissions(workspaceId: number): Observable<IUserPermissions> {
        return this.http.get<any>(`/api/workspaces/${workspaceId}/permissions`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching permissions for workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch permissions for workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Transfer workspace ownership to another member.
     */
    transferOwnership(workspaceId: number, userId: number): Observable<any> {
        const ownershipTransfer: IOwnershipTransfer = { user_id: userId.toString() };
        return this.http.post<any>(`/api/workspaces/${workspaceId}/transfer-ownership`, ownershipTransfer, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error transferring ownership for workspace ${workspaceId} to user ${userId}:`, error);
                return throwError(() => new Error(`Failed to transfer ownership for workspace ${workspaceId} to user ${userId}`));
            })
        );
    }
}