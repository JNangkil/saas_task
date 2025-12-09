import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Permission } from '../models/user.model';
import { PermissionService } from '../services/permission.service';

/**
 * Permission directive to conditionally show/hide elements based on user permissions
 *
 * Usage:
 * *ngIf="hasPermission; permission: 'task:assign'"
 * *ngIf="hasAnyPermission; permissions: ['task:assign', 'task:delete']"
 * *ngIf="hasAllPermissions; permissions: ['task:assign', 'task:delete']"
 * *ngIf="lacksPermission; permission: 'task:delete'"
 */
@Directive({
    selector: '[hasPermission], [hasAnyPermission], [hasAllPermissions], [lacksPermission]'
})
export class PermissionDirective implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private subscription: Subscription | null = null;

    @Input('hasPermission') permission: Permission | Permission[] | null = null;
    @Input('hasAnyPermission') permissions: Permission[] | null = null;
    @Input('hasAllPermissions') allPermissions: Permission[] | null = null;
    @Input('lacksPermission') lackPermission: Permission | null = null;
    @Input() else: TemplateRef<any> | null = null;

    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private permissionService: PermissionService
    ) {}

    ngOnInit(): void {
        this.checkPermission();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    private checkPermission(): void {
        let permissionCheck$: Observable<boolean>;

        if (this.permission) {
            // Check single permission
            if (Array.isArray(this.permission)) {
                // If array is passed to hasPermission, treat as hasAnyPermission
                permissionCheck$ = this.permissionService.hasAnyPermission$(this.permission);
            } else {
                permissionCheck$ = this.permissionService.hasPermission$(this.permission);
            }
        } else if (this.permissions) {
            // Check if user has any of the specified permissions
            permissionCheck$ = this.permissionService.hasAnyPermission$(this.permissions);
        } else if (this.allPermissions) {
            // Check if user has all of the specified permissions
            permissionCheck$ = this.permissionService.hasAllPermissions$(this.allPermissions);
        } else if (this.lackPermission) {
            // Check if user lacks the permission
            permissionCheck$ = this.permissionService.hasPermission$(this.lackPermission).pipe(
                map(hasPermission => !hasPermission)
            );
        } else {
            // No permission specified, hide element
            this.hideView();
            return;
        }

        // Subscribe to permission check and update view
        this.subscription = permissionCheck$
            .pipe(takeUntil(this.destroy$))
            .subscribe(hasPermission => {
                if (hasPermission) {
                    this.showView();
                } else {
                    this.hideView();
                }
            });
    }

    private showView(): void {
        if (!this.hasView) {
            this.viewContainer.clear();

            if (this.else) {
                // Show else template if provided
                this.viewContainer.createEmbeddedView(this.else);
            } else {
                // Show main template
                this.viewContainer.createEmbeddedView(this.templateRef);
            }

            this.hasView = true;
        }
    }

    private hideView(): void {
        if (this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }

    /**
     * Update the directive's permission check
     * Call this when the permission inputs change
     */
    updateView(): void {
        this.checkPermission();
    }
}