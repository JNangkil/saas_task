import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { LayoutModule } from '../../layout/layout.module';
import { WorkspaceBillingPageComponent } from './pages/workspace-billing-page/workspace-billing-page.component';
import { WorkspaceMembersPageComponent } from './pages/workspace-members-page/workspace-members-page.component';
import { WorkspaceOverviewPageComponent } from './pages/workspace-overview-page/workspace-overview-page.component';
import { WorkspaceSettingsPageComponent } from './pages/workspace-settings-page/workspace-settings-page.component';
import { WorkspaceRoutingModule } from './workspace-routing.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    LayoutModule,
    WorkspaceOverviewPageComponent,
    WorkspaceSettingsPageComponent,
    WorkspaceBillingPageComponent,
    WorkspaceMembersPageComponent,
    WorkspaceRoutingModule
  ]
})
export class WorkspaceModule {}
