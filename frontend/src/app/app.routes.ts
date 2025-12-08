import { Routes } from '@angular/router';
import { WorkspaceManagementComponent } from './pages/workspace-management/workspace-management.component';
import { WorkspaceListComponent } from './components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from './components/workspace-form/workspace-form.component';
import { AcceptInvitationComponent } from './components/accept-invitation/accept-invitation.component';

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
        path: '',
        redirectTo: '/workspaces',
        pathMatch: 'full'
    }
];
