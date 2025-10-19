import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { LayoutModule } from '../../layout/layout.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { ActivityFeedComponent } from './components/activity-feed/activity-feed.component';
import { ProjectOverviewComponent } from './components/project-overview/project-overview.component';
import { TaskSummaryComponent } from './components/task-summary/task-summary.component';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';

@NgModule({
  declarations: [DashboardHomeComponent, ActivityFeedComponent, ProjectOverviewComponent, TaskSummaryComponent],
  imports: [CommonModule, SharedModule, LayoutModule, DashboardRoutingModule]
})
export class DashboardModule {}
