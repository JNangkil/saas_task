import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';

@NgModule({
  imports: [CommonModule, SharedModule, ReportsRoutingModule]
})
export class ReportsModule {}
