import { Routes } from '@angular/router';
import { WorkspaceManagementComponent } from './pages/workspace-management/workspace-management.component';
import { WorkspaceListComponent } from './components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from './components/workspace-form/workspace-form.component';
import { AcceptInvitationComponent } from './components/accept-invitation/accept-invitation.component';
import { PricingPageComponent } from './components/pricing-page/pricing-page.component';
import { BillingSettingsComponent } from './components/billing-settings/billing-settings.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'workspaces',
        component: WorkspaceManagementComponent,
        children: [
            {
                path: '',
                component: WorkspaceListComponent
            },
            {
                path: 'create',
                component: WorkspaceFormComponent
            },
            {
                path: ':id/edit', // Edit workspace
                component: WorkspaceFormComponent
            }
        ]
    },
    {
        path: 'workspaces/:workspaceId',
        loadComponent: () => import('./components/workspace-layout/workspace-layout').then(m => m.WorkspaceLayout),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'boards',
                loadComponent: () => import('./components/board-list/board-list').then(m => m.BoardList)
            },
            {
                path: 'boards/:boardId',
                loadComponent: () => import('./components/board-detail/board-detail').then(m => m.BoardDetail)
            },
            {
                path: 'boards/:boardId/settings',
                loadComponent: () => import('./components/board-settings/board-settings').then(m => m.BoardSettings)
            }
        ]
    },
    {
        path: 'accept-invitation/:token',
        component: AcceptInvitationComponent
    },
    {
        path: 'pricing',
        component: PricingPageComponent
    },
    {
        path: 'billing',
        component: BillingSettingsComponent,
        canActivate: [AuthGuard],
        title: 'Billing Settings'
    },
    {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile-page.component').then(m => m.ProfilePageComponent),
        canActivate: [AuthGuard],
        title: 'Profile Settings'
    },
    {
        path: 'users',
        loadComponent: () => import('./pages/tenant-users/tenant-user-management-page.component').then(m => m.TenantUserManagementPageComponent),
        canActivate: [AuthGuard],
        title: 'User Management'
    },
    {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications),
        canActivate: [AuthGuard],
        title: 'Notifications'
    },
    {
        path: '',
        redirectTo: '/workspaces',
        pathMatch: 'full'
    }
];
