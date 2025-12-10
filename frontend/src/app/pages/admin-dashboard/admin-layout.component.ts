import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { TenantService } from '../../services/tenant.service';
import { UserProfile } from '../../models/user.model';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-layout.component.html',
    styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
    currentUser: UserProfile | null = null;
    tenantName: string = '';
    isSidebarCollapsed = false;

    navItems = [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard', exact: true },
        { path: '/dashboard/team', icon: 'group', label: 'Team' },
        { path: '/dashboard/settings', icon: 'settings', label: 'Settings' },
        { path: '/workspaces', icon: 'folder', label: 'Workspaces' },
        { path: '/users', icon: 'people', label: 'User Management' },
        { path: '/billing', icon: 'credit_card', label: 'Billing' }
    ];

    constructor(
        private userService: UserService,
        private tenantService: TenantService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.loadTenantData();
    }

    private loadUserData(): void {
        this.userService.getCurrentUser().subscribe({
            next: (user) => {
                this.currentUser = user;
            },
            error: (error: unknown) => {
                console.error('Failed to load user:', error);
            }
        });
    }

    private loadTenantData(): void {
        this.tenantService.getCurrentTenant().subscribe({
            next: (tenant) => {
                this.tenantName = tenant?.name || 'My Organization';
            },
            error: (error: unknown) => {
                console.error('Failed to load tenant:', error);
            }
        });
    }

    toggleSidebar(): void {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }

    getUserInitials(): string {
        if (!this.currentUser?.name) return '?';
        return this.currentUser.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
}
