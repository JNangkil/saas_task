import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { WorkspaceRoutingModule } from './workspace-routing.module';

@NgModule({
  imports: [CommonModule, SharedModule, WorkspaceRoutingModule]
})
export class WorkspaceModule {}
