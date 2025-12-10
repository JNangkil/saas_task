import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface Tenant {
  id: number;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  subscription?: {
    id: number;
    plan: {
      id: number;
      name: string;
      price: number;
      billing_interval: 'monthly' | 'yearly';
      features?: string[];
      limits?: {
        users: number;
        workspaces: number;
        boards_per_workspace: number;
        storage_mb: number;
      };
    };
    status: 'active' | 'cancelled' | 'past_due';
    ends_at?: string;
  };
  users_count: number;
  workspaces_count: number;
  boards_count: number;
  tasks_count: number;
}

export interface Plan {
  id: number;
  name: string;
  price: number;
  billing_interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    users: number;
    workspaces: number;
    boards_per_workspace: number;
    storage_mb: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemMetrics {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_workspaces: number;
  total_boards: number;
  total_tasks: number;
  total_subscriptions: number;
  active_subscriptions: number;
  monthly_revenue: number;
  yearly_revenue: number;
  recent_signups: Array<{
    date: string;
    count: number;
  }>;
  subscription_distribution: Array<{
    plan_name: string;
    count: number;
  }>;
}

export interface SystemSettings {
  [key: string]: any;
}

export interface SystemLog {
  id: number;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context: any;
  tenant_id?: number;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  constructor(private apiService: ApiService) { }

  // Tenant Management
  getTenants(params: {
    search?: string;
    status?: string;
    per_page?: number;
    page?: number;
  } = {}): Observable<PaginatedResponse<Tenant>> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());

    return this.apiService.get<PaginatedResponse<Tenant>>('super-admin/tenants', { params: httpParams });
  }

  getTenant(id: number): Observable<Tenant> {
    return this.apiService.get<Tenant>(`super-admin/tenants/${id}`);
  }

  updateTenantStatus(id: number, status: 'active' | 'inactive' | 'suspended'): Observable<Tenant> {
    return this.apiService.patch<Tenant>(`super-admin/tenants/${id}/status`, { status });
  }

  impersonateTenant(id: number): Observable<{ token: string }> {
    return this.apiService.post<{ token: string }>(`super-admin/tenants/${id}/impersonate`, {});
  }

  updateTenantSubscription(id: number, subscriptionData: {
    plan_id: number;
    status?: string;
    ends_at?: string;
  }): Observable<Tenant> {
    return this.apiService.patch<Tenant>(`super-admin/tenants/${id}/subscription`, subscriptionData);
  }

  // Plan Management
  getPlans(): Observable<Plan[]> {
    return this.apiService.get<Plan[]>('super-admin/plans');
  }

  createPlan(planData: Partial<Plan>): Observable<Plan> {
    return this.apiService.post<Plan>('super-admin/plans', planData);
  }

  updatePlan(id: number, planData: Partial<Plan>): Observable<Plan> {
    return this.apiService.patch<Plan>(`super-admin/plans/${id}`, planData);
  }

  deletePlan(id: number): Observable<void> {
    return this.apiService.delete<void>(`super-admin/plans/${id}`);
  }

  // System Metrics
  getSystemMetrics(): Observable<SystemMetrics> {
    return this.apiService.get<SystemMetrics>('super-admin/system/metrics');
  }

  // System Settings
  getSystemSettings(params: { search?: string; type?: string } = {}): Observable<SystemSettings> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.type) httpParams = httpParams.set('type', params.type);

    return this.apiService.get<SystemSettings>('super-admin/settings', { params: httpParams });
  }

  updateSystemSettings(settings: SystemSettings): Observable<SystemSettings> {
    return this.apiService.patch<SystemSettings>('super-admin/settings', settings);
  }

  getSystemSetting(key: string): Observable<any> {
    return this.apiService.get<any>(`super-admin/settings/${key}`);
  }

  updateSystemSetting(key: string, value: any): Observable<any> {
    return this.apiService.patch<any>(`super-admin/settings/${key}`, { value });
  }

  // System Logs
  getSystemLogs(params: {
    level?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  } = {}): Observable<PaginatedResponse<SystemLog>> {
    let httpParams = new HttpParams();
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.date_from) httpParams = httpParams.set('date_from', params.date_from);
    if (params.date_to) httpParams = httpParams.set('date_to', params.date_to);
    if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());

    return this.apiService.get<PaginatedResponse<SystemLog>>('super-admin/system/logs', { params: httpParams });
  }

  // Subscription Management
  getSubscriptionSummary(): Observable<any> {
    return this.apiService.get<any>('super-admin/subscriptions/summary');
  }

  getSubscriptions(params: {
    status?: string;
    plan_id?: number;
    billing_interval?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  } = {}): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.plan_id) httpParams = httpParams.set('plan_id', params.plan_id.toString());
    if (params.billing_interval) httpParams = httpParams.set('billing_interval', params.billing_interval);
    if (params.date_from) httpParams = httpParams.set('date_from', params.date_from);
    if (params.date_to) httpParams = httpParams.set('date_to', params.date_to);
    if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());

    return this.apiService.get<PaginatedResponse<any>>('super-admin/subscriptions', { params: httpParams });
  }
}
