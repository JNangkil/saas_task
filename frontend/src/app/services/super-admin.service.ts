import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SystemMetrics {
    totalTenants: number;
    totalUsers: number;
    totalWorkspaces: number;
    totalTasks: number;
    activeSubscriptions: number;
    revenueThisMonth: number;
    newUsersThisMonth: number;
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    billing_interval: 'monthly' | 'yearly';
    features?: string[];
    is_active?: boolean;  // FIX: Add missing is_active property
    limits?: {
        users: number;
        workspaces: number;
        boards_per_workspace: number;
        storage_mb: number;
    };
}

export interface Tenant {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended' | 'deactivated';
    subscription?: {
        plan: Plan;
        status: string;
        ends_at: string;
    };
    created_at: string;
    updated_at: string;
}

export interface SystemSettings {
    site_name: string;
    site_description: string;
    allow_registration: boolean;
    default_plan_id: number;
    maintenance_mode: boolean;
    maintenance_message: string;
}

@Injectable({
    providedIn: 'root'
})
export class SuperAdminService {
    private apiUrl = '/api/admin';

    constructor(private http: HttpClient) { }

    /**
     * Get system metrics
     */
    getSystemMetrics(): Observable<SystemMetrics> {
        return this.http.get<SystemMetrics>(`${this.apiUrl}/metrics`);
    }

    /**
     * Get paginated tenants
     */
    getTenants(params?: any): Observable<{ data: Tenant[]; total: number }> {
        return this.http.get<{ data: Tenant[]; total: number }>(`${this.apiUrl}/tenants`, { params });
    }

    /**
     * Get all tenants (without pagination)
     */
    getAllTenants(): Observable<{ data: Tenant[] }> {
        return this.http.get<{ data: Tenant[] }>(`${this.apiUrl}/tenants/all`);
    }

    /**
     * Get tenant by ID
     */
    getTenant(id: number): Observable<Tenant> {
        return this.http.get<Tenant>(`${this.apiUrl}/tenants/${id}`);
    }

    /**
     * Get all plans
     */
    getPlans(): Observable<{ data: Plan[] }> {
        return this.http.get<{ data: Plan[] }>(`${this.apiUrl}/plans`);
    }

    /**
     * Update plan
     */
    updatePlan(id: number, plan: Partial<Plan>): Observable<Plan> {
        return this.http.put<Plan>(`${this.apiUrl}/plans/${id}`, plan);
    }

    /**
     * Get system settings
     */
    getSystemSettings(): Observable<SystemSettings> {
        return this.http.get<SystemSettings>(`${this.apiUrl}/settings`);
    }

    /**
     * Update system settings
     */
    updateSystemSettings(settings: Partial<SystemSettings>): Observable<SystemSettings> {
        return this.http.put<SystemSettings>(`${this.apiUrl}/settings`, settings);
    }

    /**
     * Update tenant status
     */
    updateTenantStatus(tenantId: number, status: 'active' | 'inactive' | 'suspended'): Observable<Tenant> {
        return this.http.put<Tenant>(`${this.apiUrl}/tenants/${tenantId}/status`, { status });
    }

    /**
     * Delete plan
     */
    deletePlan(planId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/plans/${planId}`);
    }

    /**
     * Get system logs
     */
    getSystemLogs(params?: any): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/logs`, { params });
    }
}