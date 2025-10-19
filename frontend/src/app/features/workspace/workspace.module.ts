import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { WorkspaceRoutingModule } from './workspace-routing.module';
import { WorkspaceOverviewComponent } from './components/workspace-overview/workspace-overview.component';

@NgModule({
  imports: [CommonModule, SharedModule, WorkspaceOverviewComponent, WorkspaceRoutingModule]
})
export class WorkspaceModule {}
