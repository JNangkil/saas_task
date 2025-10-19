import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AvatarComponent } from './components/avatar/avatar.component';
import { BadgeComponent } from './components/badge/badge.component';
import { AutofocusDirective } from './directives/autofocus.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { PermissionDirective } from './directives/permission.directive';
import { FilterByPipe } from './pipes/filter-by.pipe';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';

@NgModule({
  declarations: [
    AvatarComponent,
    BadgeComponent,
    AutofocusDirective,
    ClickOutsideDirective,
    PermissionDirective,
    FilterByPipe,
    SafeHtmlPipe,
    TruncatePipe
  ],
  imports: [CommonModule],
  exports: [
    AvatarComponent,
    BadgeComponent,
    AutofocusDirective,
    ClickOutsideDirective,
    PermissionDirective,
    FilterByPipe,
    SafeHtmlPipe,
    TruncatePipe
  ]
})
export class SharedModule {}
