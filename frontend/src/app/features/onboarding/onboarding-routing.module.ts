import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OnboardingLayoutComponent } from './components/onboarding-layout/onboarding-layout.component';
import { CompanyDetailsComponent } from './pages/company-details/company-details.component';
import { InviteTeamComponent } from './pages/invite-team/invite-team.component';
import { PlanSelectionComponent } from './pages/plan-selection/plan-selection.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';

const routes: Routes = [
  {
    path: '',
    component: OnboardingLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'welcome' },
      { path: 'welcome', component: WelcomeComponent },
      { path: 'company', component: CompanyDetailsComponent },
      { path: 'invite', component: InviteTeamComponent },
      { path: 'plan', component: PlanSelectionComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule {}
