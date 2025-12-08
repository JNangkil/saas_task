import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { WorkspaceMemberService } from '../services/workspace-member.service';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { IUserPermissions } from '../interfaces/workspace-member.interface';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceRoleGuard implements CanActivate {
    constructor(
        private workspaceMemberService: WorkspaceMemberService,
        private workspaceContextService: WorkspaceContextService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
        // Get the minimum required role from route data
        const requiredRole = route.data['requiredRole'] as WorkspaceRole;

        if (!requiredRole) {
            console.error('WorkspaceRoleGuard: No requiredRole specified in route data');
            return of(false);
        }

        // Check if workspace context is available
        const currentWorkspace = this.workspaceContextService.context.currentWorkspace;

        if (!currentWorkspace) {
            // No workspace selected, redirect to workspace selection
            this.router.navigate(['/workspaces']);
            return of(false);
        }

        // Get user permissions for the current workspace
        return this.workspaceMemberService.getPermissions(parseInt(currentWorkspace.id)).pipe(
            map((permissions: IUserPermissions) => {
                // Check if user has the required role
                const hasRequiredRole = this.checkRoleHierarchy(permissions.role, requiredRole);

                if (!hasRequiredRole) {
                    // User doesn't have required role, redirect to unauthorized page
                    this.router.navigate(['/unauthorized']);
                    return false;
                }

                return true;
            }),
            catchError((error) => {
                console.error('WorkspaceRoleGuard: Error checking user role:', error);
                // Error checking permissions, redirect to login
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }

    /**
     * Check if user's role meets the minimum required role based on hierarchy
     * owner > admin > member > viewer
     */
    private checkRoleHierarchy(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
        const roleHierarchy: Record<WorkspaceRole, number> = {
            'viewer': 1,
            'member': 2,
            'admin': 3,
            'owner': 4
        };

        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }
}