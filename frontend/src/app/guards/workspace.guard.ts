import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { TenantService } from '../services/tenant.service';
import { WorkspaceMemberService } from '../services/workspace-member.service';
import { IUserPermissions } from '../interfaces/workspace-member.interface';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceGuard implements CanActivate {
    constructor(
        private workspaceContextService: WorkspaceContextService,
        private tenantService: TenantService,
        private workspaceMemberService: WorkspaceMemberService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean> {
        const context = this.workspaceContextService.context;

        // Check if user has a current workspace selected
        if (context.currentWorkspace) {
            // Verify user still has access to the workspace
            return this.verifyWorkspaceAccess(context.currentWorkspace.id);
        }

        // If no current workspace, try to load user's workspaces
        return this.tenantService.getTenants().pipe(
            map(tenants => {
                if (tenants && tenants.length > 0) {
                    // User has tenants but no workspace selected
                    // Redirect to workspace selection
                    this.router.navigate(['/workspaces']);
                    return false;
                } else {
                    // User has no tenants, redirect to onboarding
                    this.router.navigate(['/onboarding']);
                    return false;
                }
            }),
            catchError(() => {
                // Error loading tenants, redirect to login
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }

    /**
     * Verify that the user still has access to the current workspace
     */
    private verifyWorkspaceAccess(workspaceId: string): Observable<boolean> {
        return this.workspaceMemberService.getPermissions(parseInt(workspaceId)).pipe(
            map((permissions: IUserPermissions) => {
                // User has access to the workspace
                return true;
            }),
            catchError((error) => {
                console.error('WorkspaceGuard: Error verifying workspace access:', error);
                // User no longer has access to the workspace, clear context and redirect
                this.workspaceContextService.setCurrentWorkspace(null);
                this.router.navigate(['/workspaces']);
                return of(false);
            })
        );
    }
}