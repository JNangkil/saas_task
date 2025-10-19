import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../models/user.model';

@Directive({
  standalone: false,
  selector: '[tfPermission]'
})
export class PermissionDirective {
  private roles: UserRole[] = [];

  constructor(
    private readonly viewContainer: ViewContainerRef,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly auth: AuthService
  ) {}

  @Input()
  set tfPermission(roles: UserRole | UserRole[]) {
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  private updateView(): void {
    const canRender = this.roles.some(role => this.auth.hasRole(role));
    this.viewContainer.clear();
    if (canRender) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
