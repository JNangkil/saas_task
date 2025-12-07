import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ITenant } from '../interfaces/workspace.interface';

@Injectable({
    providedIn: 'root'
})
export class TenantService {
    private readonly apiUrl = '/api/tenants';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    constructor(private http: HttpClient) { }

    /**
     * Get all tenants for the current user.
     */
    getTenants(): Observable<ITenant[]> {
        return this.http.get<ITenant[]>(this.apiUrl).pipe(
            map(response => response.data || []),
            catchError(error => {
                console.error('Error fetching tenants:', error);
                return throwError(() => new Error('Failed to fetch tenants'));
            })
        );
    }

    /**
     * Get a specific tenant by ID.
     */
    getTenant(id: string): Observable<ITenant> {
        return this.http.get<ITenant>(`${this.apiUrl}/${id}`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching tenant ${id}:`, error);
                return throwError(() => new Error(`Failed to fetch tenant ${id}`));
            })
        );
    }

    /**
     * Create a new tenant.
     */
    createTenant(tenantData: Partial<ITenant>): Observable<ITenant> {
        return this.http.post<ITenant>(this.apiUrl, tenantData, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Error creating tenant:', error);
                return throwError(() => new Error('Failed to create tenant'));
            })
        );
    }

    /**
     * Update an existing tenant.
     */
    updateTenant(id: string, tenantData: Partial<ITenant>): Observable<ITenant> {
        return this.http.put<ITenant>(`${this.apiUrl}/${id}`, tenantData, this.httpOptions).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating tenant ${id}:`, error);
                return throwError(() => new Error(`Failed to update tenant ${id}`));
            })
        );
    }

    /**
     * Archive/deactivate a tenant.
     */
    archiveTenant(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/archive`).pipe(
            catchError(error => {
                console.error(`Error archiving tenant ${id}:`, error);
                return throwError(() => new Error(`Failed to archive tenant ${id}`));
            })
        );
    }

    /**
     * Reactivate a tenant.
     */
    reactivateTenant(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/reactivate`).pipe(
            catchError(error => {
                console.error(`Error reactivating tenant ${id}:`, error);
                return throwError(() => new Error(`Failed to reactivate tenant ${id}`));
            })
        );
    }

    /**
     * Delete a tenant.
     */
    deleteTenant(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            catchError(error => {
                console.error(`Error deleting tenant ${id}:`, error);
                return throwError(() => new Error(`Failed to delete tenant ${id}`));
            })
        );
    }

    /**
     * Get tenant members.
     */
    getTenantMembers(id: string): Observable<any[]> {
        return this.http.get(`${this.apiUrl}/${id}/members`).pipe(
            map(response => response.data || []),
            catchError(error => {
                console.error(`Error fetching tenant members for ${id}:`, error);
                return throwError(() => new Error(`Failed to fetch tenant members for ${id}`));
            })
        );
    }

    /**
     * Add a member to a tenant.
     */
    addTenantMember(tenantId: string, memberData: { email: string; role: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tenantId}/members`, memberData).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error adding member to tenant ${tenantId}:`, error);
                return throwError(() => new Error(`Failed to add member to tenant ${tenantId}`));
            })
        );
    }

    /**
     * Update a member's role in a tenant.
     */
    updateTenantMemberRole(tenantId: string, userId: string, role: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${tenantId}/members/${userId}`, { role }).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating member role in tenant ${tenantId}:`, error);
                return throwError(() => new Error(`Failed to update member role in tenant ${tenantId}`));
            })
        );
    }

    /**
     * Remove a member from a tenant.
     */
    removeTenantMember(tenantId: string, userId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${tenantId}/members/${userId}`).pipe(
            catchError(error => {
                console.error(`Error removing member from tenant ${tenantId}:`, error);
                return throwError(() => new Error(`Failed to remove member from tenant ${tenantId}`));
            })
        );
    }

    /**
     * Get tenant settings.
     */
    getTenantSettings(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}/settings`).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error fetching tenant settings for ${id}:`, error);
                return throwError(() => new Error(`Failed to fetch tenant settings for ${id}`));
            })
        );
    }

    /**
     * Update tenant settings.
     */
    updateTenantSettings(id: string, settings: Record<string, any>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/settings`, { settings }).pipe(
            map(response => response.data),
            catchError(error => {
                console.error(`Error updating tenant settings for ${id}:`, error);
                return throwError(() => new Error(`Failed to update tenant settings for ${id}`));
            })
        );
    }
}