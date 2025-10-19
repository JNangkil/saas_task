import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { OnboardingLayoutComponent } from './components/onboarding-layout/onboarding-layout.component';
import { OnboardingRoutingModule } from './onboarding-routing.module';
import { CompanyDetailsComponent } from './pages/company-details/company-details.component';
import { InviteTeamComponent } from './pages/invite-team/invite-team.component';
import { PlanSelectionComponent } from './pages/plan-selection/plan-selection.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { OnboardingStateService } from './services/onboarding-state.service';

@NgModule({
  declarations: [
    OnboardingLayoutComponent,
    WelcomeComponent,
    CompanyDetailsComponent,
    InviteTeamComponent,
    PlanSelectionComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, OnboardingRoutingModule],
  providers: [OnboardingStateService]
})
export class OnboardingModule {}
