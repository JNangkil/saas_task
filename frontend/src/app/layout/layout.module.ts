import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { AppSidebarComponent } from './components/app-sidebar/app-sidebar.component';
import { UserMenuComponent } from './components/user-menu/user-menu.component';

@NgModule({
  declarations: [AppShellComponent, AppSidebarComponent, AppHeaderComponent, UserMenuComponent],
  imports: [CommonModule, RouterModule, SharedModule],
  exports: [AppShellComponent, AppSidebarComponent, AppHeaderComponent, UserMenuComponent]
})
export class LayoutModule {}
