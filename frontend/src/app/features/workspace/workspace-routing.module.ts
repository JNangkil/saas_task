import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WorkspaceOverviewComponent } from './components/workspace-overview/workspace-overview.component';

const routes: Routes = [
  { path: '', component: WorkspaceOverviewComponent },
  {
    path: ':workspaceId',
    children: [
      { path: '', component: WorkspaceOverviewComponent },
      { path: ':section', component: WorkspaceOverviewComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WorkspaceRoutingModule {}
