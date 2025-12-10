import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserService } from '../services/user.service';

/**
 * AdminGuard protects routes that require tenant admin access.
 * Allows access only for users with 'owner' or 'admin' roles.
 */
@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    constructor(
        private userService: UserService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean | UrlTree> {
        return this.userService.getCurrentUser().pipe(
            map(user => {
                if (!user) {
                    return this.router.createUrlTree(['/login']);
                }

                // Super admin can access everything
                if (user.is_super_admin) {
                    return true;
                }

                // Check tenant role (from pivot if available)
                const role = (user as any).pivot?.role || (user as any).role;

                if (role === 'owner' || role === 'admin') {
                    return true;
                }

                // Redirect non-admin users to workspaces
                return this.router.createUrlTree(['/workspaces']);
            }),
            catchError((error) => {
                console.error('AdminGuard: Error checking permissions', error);
                return of(this.router.createUrlTree(['/login']));
            })
        );
    }
}
