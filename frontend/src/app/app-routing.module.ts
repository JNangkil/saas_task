import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { OnboardingGuard } from './core/guards/onboarding.guard';
import { RoleGuard } from './core/guards/role.guard';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { MarketingComponent } from './pages/marketing/marketing.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: MarketingComponent },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'onboarding',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/onboarding/onboarding.module').then(m => m.OnboardingModule)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'projects',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule)
  },
  {
    path: 'tasks',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/tasks/tasks.module').then(m => m.TasksModule)
  },
  {
    path: 'teams',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/teams/teams.module').then(m => m.TeamsModule)
  },
  {
    path: 'workspace',
    canActivate: [AuthGuard, OnboardingGuard, RoleGuard],
    data: { roles: ['Owner', 'Admin'] },
    loadChildren: () => import('./features/workspace/workspace.module').then(m => m.WorkspaceModule)
  },
  {
    path: 'reports',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/reports/reports.module').then(m => m.ReportsModule)
  },
  {
    path: 'settings',
    canActivate: [AuthGuard, OnboardingGuard],
    loadChildren: () => import('./features/settings/settings.module').then(m => m.SettingsModule)
  },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
