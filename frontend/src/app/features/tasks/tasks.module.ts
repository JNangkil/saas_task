import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { TasksRoutingModule } from './tasks-routing.module';

@NgModule({
  imports: [CommonModule, SharedModule, TasksRoutingModule]
})
export class TasksModule {}
