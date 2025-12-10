import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {

    constructor(
        private permissionService: PermissionService,
        private router: Router
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        // Check if user has super admin permissions
        // Since there's no specific SUPER_ADMIN_ACCESS permission, we'll check for tenant management permissions
        const hasSuperAdminAccess = this.permissionService.hasAllPermissions([
            Permission.TENANT_MANAGE_USERS,
            Permission.TENANT_MANAGE_SETTINGS,
            Permission.TENANT_MANAGE_SUBSCRIPTION
        ]);

        if (hasSuperAdminAccess) {
            return true;
        }

        // Redirect to dashboard or unauthorized page if not super admin
        this.router.navigate(['/dashboard']);
        return false;
    }
}