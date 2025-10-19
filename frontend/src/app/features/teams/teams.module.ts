import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { TeamsRoutingModule } from './teams-routing.module';

@NgModule({
  imports: [CommonModule, SharedModule, TeamsRoutingModule]
})
export class TeamsModule {}
