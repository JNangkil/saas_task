import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
    IInvitation,
    ICreateInvitationRequest,
    IInvitationDetails,
    IAcceptInvitationRequest,
    IInvitationListResponse
} from '../interfaces/invitation.interface';

@Injectable({
    providedIn: 'root'
})
export class InvitationService {
    private readonly apiUrl = '/api/invitations';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    constructor(private http: HttpClient) { }

    /**
     * Create a new invitation for a workspace.
     */
    createInvitation(workspaceId: number, data: ICreateInvitationRequest): Observable<IInvitation> {
        return this.http.post<any>(`/api/workspaces/${workspaceId}/invitations`, data, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Error creating invitation:', error);
                return throwError(() => new Error('Failed to create invitation'));
            })
        );
    }

    /**
     * Get all pending invitations for a workspace.
     */
    getInvitations(workspaceId: number): Observable<IInvitationListResponse> {
        return this.http.get<any>(`/api/workspaces/${workspaceId}/invitations`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching invitations for workspace ${workspaceId}:`, error);
                return throwError(() => new Error(`Failed to fetch invitations for workspace ${workspaceId}`));
            })
        );
    }

    /**
     * Cancel an invitation.
     */
    cancelInvitation(workspaceId: number, invitationId: number): Observable<any> {
        return this.http.delete<any>(`/api/workspaces/${workspaceId}/invitations/${invitationId}`).pipe(
            catchError(error => {
                console.error(`Error cancelling invitation ${invitationId}:`, error);
                return throwError(() => new Error(`Failed to cancel invitation ${invitationId}`));
            })
        );
    }

    /**
     * Resend an invitation.
     */
    resendInvitation(workspaceId: number, invitationId: number): Observable<any> {
        return this.http.post<any>(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {}).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error resending invitation ${invitationId}:`, error);
                return throwError(() => new Error(`Failed to resend invitation ${invitationId}`));
            })
        );
    }

    /**
     * Get invitation details by token.
     */
    getInvitationByToken(token: string): Observable<IInvitationDetails> {
        return this.http.get<any>(`/api/invitations/${token}`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching invitation details for token ${token}:`, error);
                return throwError(() => new Error(`Failed to fetch invitation details for token ${token}`));
            })
        );
    }

    /**
     * Accept an invitation.
     */
    acceptInvitation(token: string, data?: IAcceptInvitationRequest): Observable<any> {
        return this.http.post<any>(`/api/invitations/${token}/accept`, data || {}, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error accepting invitation with token ${token}:`, error);
                return throwError(() => new Error(`Failed to accept invitation with token ${token}`));
            })
        );
    }

    /**
     * Decline an invitation.
     */
    declineInvitation(token: string): Observable<any> {
        return this.http.post<any>(`/api/invitations/${token}/decline`, {}, this.httpOptions).pipe(
            catchError(error => {
                console.error(`Error declining invitation with token ${token}:`, error);
                return throwError(() => new Error(`Failed to decline invitation with token ${token}`));
            })
        );
    }
}