import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WorkspaceMemberService } from '../services/workspace-member.service';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { IUserPermissions } from '../interfaces/workspace-member.interface';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

@Directive({
    selector: '[hasRole]',
    standalone: true
})
export class HasRoleDirective implements OnInit {
    @Input() hasRole!: WorkspaceRole;
    @Input() hasRoleElse: TemplateRef<any> | null = null;

    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private workspaceMemberService: WorkspaceMemberService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    ngOnInit(): void {
        this.checkRole();
    }

    private checkRole(): void {
        // Check if workspace context is available
        const currentWorkspace = this.workspaceContextService.context.currentWorkspace;

        if (!currentWorkspace) {
            // No workspace selected, hide the element
            this.updateView(false);
            return;
        }

        // Get user permissions for the current workspace
        this.workspaceMemberService.getPermissions(parseInt(currentWorkspace.id)).pipe(
            map((permissions: IUserPermissions) => {
                // Check if user has the required role
                const hasRequiredRole = this.checkRoleHierarchy(permissions.role, this.hasRole);
                this.updateView(hasRequiredRole);
                return hasRequiredRole;
            }),
            catchError((error) => {
                console.error('HasRoleDirective: Error checking user role:', error);
                // Error checking permissions, hide the element
                this.updateView(false);
                return of(false);
            })
        ).subscribe();
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

    private updateView(hasPermission: boolean): void {
        if (hasPermission && !this.hasView) {
            // Show the element
            this.viewContainer.clear();
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!hasPermission && this.hasView) {
            // Hide the element
            this.viewContainer.clear();
            this.hasView = false;

            // Show else template if provided
            if (this.hasRoleElse) {
                this.viewContainer.createEmbeddedView(this.hasRoleElse);
            }
        }
    }
}