import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TenantUserService } from '../../services/tenant-user.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../services/toast.service';
import { TenantUser, TenantUserUpdate } from '../../models/user.model';
import { Permission } from '../../models/user.model';

@Component({
    selector: 'app-tenant-user-management-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './tenant-user-management-page.component.html',
    styleUrls: ['./tenant-user-management-page.component.scss']
})
export class TenantUserManagementPageComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    users: TenantUser[] = [];
    filteredUsers: TenantUser[] = [];
    loading = false;
    searchQuery = '';
    selectedRole = '';
    selectedStatus = '';

    // Role options
    roles = [
        { value: '', label: 'All Roles' },
        { value: 'owner', label: 'Owner' },
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' },
        { value: 'viewer', label: 'Viewer' }
    ];

    // Status options
    statuses = [
        { value: '', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'pending', label: 'Pending' }
    ];

    // User being edited
    editingUser: TenantUser | null = null;
    isUpdating = false;

    // Currently logged in user ID (to prevent self-modification)
    currentUserId: number | null = null;

    // Current tenant ID
    private currentTenantId: number | null = null;

    constructor(
        private tenantUserService: TenantUserService,
        private permissionService: PermissionService,
        private toastService: ToastService
    ) {
        // Set up search debouncing
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.applyFilters();
        });
    }

    ngOnInit(): void {
        // In a real app, get current tenant ID from service
        const tenantId = this.getCurrentTenantId();
        if (tenantId) {
            this.loadUsers(tenantId);
        }

        // Get current user ID (in a real app, this would come from auth service)
        this.currentUserId = this.getCurrentUserId();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Get current tenant ID
     * In a real app, this would come from a tenant context service
     */
    private getCurrentTenantId(): number | null {
        // This would typically come from a service or route parameter
        // For now, returning a hardcoded value or null
        this.currentTenantId = 1; // TODO: Implement proper tenant resolution
        return this.currentTenantId;
    }

    /**
     * Get current user ID
     * In a real app, this would come from an auth service
     */
    private getCurrentUserId(): number | null {
        // This would typically come from an auth service
        // For now, returning a hardcoded value or null
        return 1; // TODO: Implement proper user ID resolution
    }

    /**
     * Load tenant users
     */
    private loadUsers(tenantId: number): void {
        this.loading = true;

        this.tenantUserService.getTenantUsers(tenantId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (users) => {
                    this.users = users;
                    this.filteredUsers = users;
                    this.loading = false;
                },
                error: (error) => {
                    this.toastService.showError('Failed to load users: ' + error.message);
                    this.loading = false;
                }
            });
    }

    /**
     * Handle search input
     */
    onSearchChange(): void {
        this.searchSubject.next(this.searchQuery);
    }

    /**
     * Apply filters to users list
     */
    private applyFilters(): void {
        this.filteredUsers = this.users.filter(user => {
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const matchesSearch = user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query) ||
                    (user.job_title && user.job_title.toLowerCase().includes(query));
                if (!matchesSearch) return false;
            }

            // Role filter
            if (this.selectedRole && user.pivot.role !== this.selectedRole) {
                return false;
            }

            // Status filter
            if (this.selectedStatus && user.status !== this.selectedStatus) {
                return false;
            }

            return true;
        });
    }

    /**
     * Handle role change
     */
    onRoleFilterChange(): void {
        this.applyFilters();
    }

    /**
     * Handle status change
     */
    onStatusFilterChange(): void {
        this.applyFilters();
    }

    /**
     * Start editing user
     */
    startEditing(user: TenantUser): void {
        // Don't allow editing yourself or the owner
        if (user.id === this.currentUserId || user.pivot.role === 'owner') {
            return;
        }

        this.editingUser = { ...user };
    }

    /**
     * Cancel editing
     */
    cancelEditing(): void {
        this.editingUser = null;
    }

    /**
     * Save user changes
     */
    saveUser(): void {
        if (!this.editingUser || !this.currentTenantId) {
            return;
        }

        this.isUpdating = true;
        const updateData: TenantUserUpdate = {
            role: this.editingUser.pivot.role,
            status: this.editingUser.status
        };

        this.tenantUserService.updateTenantUser(
            this.currentTenantId,
            this.editingUser.id,
            updateData
        ).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedUser) => {
                    // Update user in list
                    const index = this.users.findIndex(u => u.id === updatedUser.id);
                    if (index !== -1) {
                        this.users[index] = updatedUser;
                    }

                    // Reapply filters
                    this.applyFilters();

                    this.editingUser = null;
                    this.isUpdating = false;
                    this.toastService.showSuccess('User updated successfully');
                },
                error: (error) => {
                    this.toastService.showError('Failed to update user: ' + error.message);
                    this.isUpdating = false;
                }
            });
    }

    /**
     * Remove user from tenant
     */
    removeUser(user: TenantUser): void {
        // Don't allow removing yourself or the owner
        if (user.id === this.currentUserId || user.pivot.role === 'owner') {
            return;
        }

        if (!confirm(`Are you sure you want to remove ${user.name} from this tenant?`)) {
            return;
        }

        if (!this.currentTenantId) {
            return;
        }

        this.tenantUserService.removeUserFromTenant(
            this.currentTenantId,
            user.id
        ).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    // Remove user from list
                    this.users = this.users.filter(u => u.id !== user.id);
                    this.applyFilters();
                    this.toastService.showSuccess('User removed successfully');
                },
                error: (error) => {
                    this.toastService.showError('Failed to remove user: ' + error.message);
                }
            });
    }

    /**
     * Get role badge class
     */
    getRoleBadgeClass(role: string): string {
        switch (role) {
            case 'owner':
                return 'bg-danger';
            case 'admin':
                return 'bg-warning';
            case 'member':
                return 'bg-primary';
            case 'viewer':
                return 'bg-secondary';
            default:
                return 'bg-secondary';
        }
    }

    /**
     * Get status badge class
     */
    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active':
                return 'bg-success';
            case 'suspended':
                return 'bg-danger';
            case 'pending':
                return 'bg-warning';
            default:
                return 'bg-secondary';
        }
    }

    /**
     * Format date
     */
    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    /**
     * Can manage users check
     */
    get canManageUsers(): boolean {
        return this.permissionService.hasPermission(Permission.TENANT_MANAGE_USERS);
    }

}