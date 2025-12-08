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
                path: ':id/edit',
                component: WorkspaceFormComponent
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
        path: '',
        redirectTo: '/workspaces',
        pathMatch: 'full'
    }
];
