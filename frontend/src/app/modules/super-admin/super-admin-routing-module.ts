import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperAdminLayoutComponent } from './layout/super-admin-layout/super-admin-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TenantsComponent } from './components/tenants/tenants.component';
import { TenantDetailComponent } from './components/tenant-detail/tenant-detail.component';
import { PlansComponent } from './components/plans/plans.component';
import { SystemSettingsComponent } from './components/system-settings/system-settings.component';
import { SystemLogsComponent } from './components/system-logs/system-logs.component';
import { SuperAdminGuard } from '../../guards/super-admin.guard';

const routes: Routes = [
  {
    path: '',
    component: SuperAdminLayoutComponent,
    canActivate: [SuperAdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Dashboard' }
      },
      {
        path: 'tenants',
        component: TenantsComponent,
        data: { title: 'Tenants' }
      },
      {
        path: 'tenants/:id',
        component: TenantDetailComponent,
        data: { title: 'Tenant Details' }
      },
      {
        path: 'plans',
        component: PlansComponent,
        data: { title: 'Plans' }
      },
      {
        path: 'settings',
        component: SystemSettingsComponent,
        data: { title: 'System Settings' }
      },
      {
        path: 'logs',
        component: SystemLogsComponent,
        data: { title: 'System Logs' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperAdminRoutingModule { }
