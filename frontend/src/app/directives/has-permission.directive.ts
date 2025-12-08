import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
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

export type PermissionLogic = 'AND' | 'OR';

@Directive({
    selector: '[hasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit {
    @Input() hasPermission!: WorkspacePermission | WorkspacePermission[];
    @Input() hasPermissionLogic: PermissionLogic = 'AND';
    @Input() hasPermissionElse: TemplateRef<any> | null = null;

    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private workspaceMemberService: WorkspaceMemberService,
        private workspaceContextService: WorkspaceContextService
    ) { }

    ngOnInit(): void {
        this.checkPermissions();
    }

    private checkPermissions(): void {
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
                // Check if user has the required permission(s)
                const hasRequiredPermissions = this.evaluatePermissions(permissions.permissions);
                this.updateView(hasRequiredPermissions);
                return hasRequiredPermissions;
            }),
            catchError((error) => {
                console.error('HasPermissionDirective: Error checking user permissions:', error);
                // Error checking permissions, hide the element
                this.updateView(false);
                return of(false);
            })
        ).subscribe();
    }

    private evaluatePermissions(userPermissions: IUserPermissions['permissions']): boolean {
        if (Array.isArray(this.hasPermission)) {
            // Multiple permissions
            if (this.hasPermissionLogic === 'AND') {
                // All permissions must be true
                return this.hasPermission.every(permission => userPermissions[permission]);
            } else {
                // At least one permission must be true (OR logic)
                return this.hasPermission.some(permission => userPermissions[permission]);
            }
        } else {
            // Single permission
            return userPermissions[this.hasPermission];
        }
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
            if (this.hasPermissionElse) {
                this.viewContainer.createEmbeddedView(this.hasPermissionElse);
            }
        }
    }
}