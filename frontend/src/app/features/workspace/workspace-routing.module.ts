import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppShellComponent } from '../../layout/components/app-shell/app-shell.component';
import { WorkspaceBillingPageComponent } from './pages/workspace-billing-page/workspace-billing-page.component';
import { WorkspaceMembersPageComponent } from './pages/workspace-members-page/workspace-members-page.component';
import { WorkspaceOverviewPageComponent } from './pages/workspace-overview-page/workspace-overview-page.component';
import { WorkspaceSettingsPageComponent } from './pages/workspace-settings-page/workspace-settings-page.component';

const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: WorkspaceOverviewPageComponent },
      {
        path: ':workspaceId',
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', component: WorkspaceOverviewPageComponent },
          { path: 'settings', component: WorkspaceSettingsPageComponent },
          { path: 'billing', component: WorkspaceBillingPageComponent },
          { path: 'members', component: WorkspaceMembersPageComponent }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WorkspaceRoutingModule {}
