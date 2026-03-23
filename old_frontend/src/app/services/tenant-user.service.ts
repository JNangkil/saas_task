import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TenantUser, TenantUserUpdate } from '../models/user.model';

/**
 * Tenant user service for managing users within a tenant
 */
@Injectable({
    providedIn: 'root'
})
export class TenantUserService {
    constructor(private apiService: ApiService) { }

    /**
     * Get all users in a tenant
     *
     * @param tenantId The tenant ID
     * @returns Observable<TenantUser[]> Array of tenant users
     */
    getTenantUsers(tenantId: number): Observable<TenantUser[]> {
        return this.apiService.get<TenantUser[]>(`tenants/${tenantId}/users`);
    }

    /**
     * Update user role or status in a tenant
     *
     * @param tenantId The tenant ID
     * @param userId The user ID to update
     * @param data Update data
     * @returns Observable<TenantUser> Updated tenant user data
     */
    updateTenantUser(tenantId: number, userId: number, data: TenantUserUpdate): Observable<TenantUser> {
        return this.apiService.patch<TenantUser>(`tenants/${tenantId}/users/${userId}`, data);
    }

    /**
     * Remove a user from a tenant
     *
     * @param tenantId The tenant ID
     * @param userId The user ID to remove
     * @returns Observable<void>
     */
    removeUserFromTenant(tenantId: number, userId: number): Observable<void> {
        return this.apiService.delete<void>(`tenants/${tenantId}/users/${userId}`);
    }
}