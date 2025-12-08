import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

/**
 * AuthGuard protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 */
@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private apiService: ApiService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean> {
        // Check if user is authenticated by making a request to a protected endpoint
        return this.apiService.get('user/profile').pipe(
            map(() => {
                // User is authenticated
                return true;
            }),
            catchError((error) => {
                // User is not authenticated or token expired
                console.error('AuthGuard: Authentication failed', error);
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }
}