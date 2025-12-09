import { Injectable } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';
import { map, take } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuardService {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(): CanActivateFn {
    return (route, state) => {
      return this.userService.getCurrentUser().pipe(
        take(1),
        map(user => {
          if (user && user.is_super_admin) {
            return true;
          }

          // Redirect to unauthorized page or home
          this.router.navigate(['/unauthorized']);
          return false;
        })
      );
    };
  }
}

export const superAdminGuard: CanActivateFn = (route, state) => {
  // This will be properly injected when used in DI context
  // For now, we'll need to check if we have access to the guard service
  const injector = (route as any)._injector;
  if (injector) {
    const guard = injector.get(SuperAdminGuardService);
    return guard.canActivate()(route, state);
  }

  // Fallback - this should not happen in normal operation
  return false;
};
