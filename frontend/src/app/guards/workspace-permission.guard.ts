import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WorkspaceMemberService } from '../services/workspace-member.service';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { IUserPermissions } from '../interfaces/workspace-member.interface';

export type WorkspacePermission =
    | 'can_view'
    | 'can_edit'
    | 'can_delete'
    | 'can_manage_members'
    | 'can_manage_settings'
    | 'can_invite_members'
    | 'can_transfer_ownership';

@Injectable({
    providedIn: 'root'
})
export class WorkspacePermissionGuard implements CanActivate {
    constructor(
        private workspaceMemberService: WorkspaceMemberService,
        private workspaceContextService: WorkspaceContextService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
        // Get the required permission from route data
        const requiredPermission = route.data['requiredPermission'] as WorkspacePermission;

        if (!requiredPermission) {
            console.error('WorkspacePermissionGuard: No requiredPermission specified in route data');
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
                // Check if user has the required permission
                const hasPermission = permissions.permissions[requiredPermission];

                if (!hasPermission) {
                    // User doesn't have required permission, redirect to unauthorized page
                    this.router.navigate(['/unauthorized']);
                    return false;
                }

                return true;
            }),
            catchError((error) => {
                console.error('WorkspacePermissionGuard: Error checking user permissions:', error);
                // Error checking permissions, redirect to login
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }
}