import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const expectedRoles = route.data['roles'] as UserRole[] | undefined;

    return this.auth.ensureSession().pipe(
      map(user => {
        if (!expectedRoles || expectedRoles.some(role => user.roles.includes(role))) {
          return true;
        }

        return this.router.parseUrl('/settings');
      })
    );
  }
}
