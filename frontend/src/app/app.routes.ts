import { Routes } from '@angular/router';
import { WorkspaceManagementComponent } from './pages/workspace-management/workspace-management.component';
import { WorkspaceListComponent } from './components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from './components/workspace-form/workspace-form.component';
import { AcceptInvitationComponent } from './components/accept-invitation/accept-invitation.component';
import { PricingPageComponent } from './components/pricing-page/pricing-page.component';
import { BillingSettingsComponent } from './components/billing-settings/billing-settings.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { superAdminGuard } from './guards/super-admin-guard';
import { ForgotPasswordComponent } from './auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/components/reset-password/reset-password.component';
import { LoginComponent } from './auth/components/login/login.component';
import { MfaSetupComponent } from './auth/components/mfa-setup/mfa-setup.component';
import { MfaVerifyComponent } from './auth/components/mfa-verify/mfa-verify.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';

export const routes: Routes = [
    // Landing page - public
    {
        path: '',
        component: LandingPageComponent,
        pathMatch: 'full',
        title: 'TaskFlow - Modern Task Management'
    },
    // Admin Dashboard - for tenant owners/admins
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin-dashboard/admin-layout.component').then(m => m.AdminLayoutComponent),
        canActivate: [AuthGuard, AdminGuard],
        title: 'Admin Dashboard',
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'team',
                loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
                title: 'Team Overview'
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
                title: 'Organization Settings'
            }
        ]
    },
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
        path: 'login',
        component: LoginComponent,
        title: 'Login'
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/components/register/register.component').then(m => m.RegisterComponent),
        title: 'Create Account'
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        title: 'Forgot Password'
    },
    {
        path: 'reset-password',
        component: ResetPasswordComponent,
        title: 'Reset Password'
    },
    {
        path: 'mfa-setup',
        component: MfaSetupComponent,
        canActivate: [AuthGuard],
        title: 'MFA Setup'
    },
    {
        path: 'mfa-verify',
        component: MfaVerifyComponent,
        title: 'MFA Verification'
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
        path: 'profile/security',
        loadComponent: () => import('./pages/profile/profile-page.component').then(m => m.ProfilePageComponent),
        canActivate: [AuthGuard],
        title: 'Security Settings'
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
        path: 'admin',
        loadChildren: () => import('./modules/super-admin/super-admin-module').then(m => m.SuperAdminModule),
        canActivate: [superAdminGuard],
        title: 'Super Admin Panel'
    }
];
