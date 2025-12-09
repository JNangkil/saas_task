import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Permission, ROLE_PERMISSIONS } from '../models/user.model';
import { Tenant, Workspace } from '../models/task.model';
import { User } from '../models/user.model';

/**
 * Permission service for checking user permissions
 */
@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private userPermissions$ = new BehaviorSubject<Permission[]>([]);

    constructor(private apiService: ApiService) {
        this.loadCurrentUserPermissions();
    }

    /**
     * Load current user permissions based on their role
     */
    private loadCurrentUserPermissions(): void {
        // Get current user info from local storage or API
        // For now, we'll assume we can get the user's role from the tenant context
        // This would typically be handled by an auth service or tenant context service
    }

    /**
     * Set user permissions (typically called after login or tenant switch)
     *
     * @param role The user's role in the current tenant
     */
    setUserRole(role: string): void {
        const permissions = ROLE_PERMISSIONS[role] || [];
        this.userPermissions$.next(permissions);
    }

    /**
     * Check if user has a specific permission
     *
     * @param permission The permission to check
     * @returns boolean Whether user has the permission
     */
    hasPermission(permission: Permission): boolean {
        return this.userPermissions$.value.includes(permission);
    }

    /**
     * Check if user has any of the specified permissions
     *
     * @param permissions Array of permissions to check
     * @returns boolean Whether user has any of the permissions
     */
    hasAnyPermission(permissions: Permission[]): boolean {
        return permissions.some(permission => this.hasPermission(permission));
    }

    /**
     * Check if user has all of the specified permissions
     *
     * @param permissions Array of permissions to check
     * @returns boolean Whether user has all of the permissions
     */
    hasAllPermissions(permissions: Permission[]): boolean {
        return permissions.every(permission => this.hasPermission(permission));
    }

    /**
     * Observable version of hasPermission
     *
     * @param permission The permission to check
     * @returns Observable<boolean> Whether user has the permission
     */
    hasPermission$(permission: Permission): Observable<boolean> {
        return this.userPermissions$.pipe(
            map(permissions => permissions.includes(permission))
        );
    }

    /**
     * Observable version of hasAnyPermission
     *
     * @param permissions Array of permissions to check
     * @returns Observable<boolean> Whether user has any of the permissions
     */
    hasAnyPermission$(permissions: Permission[]): Observable<boolean> {
        return this.userPermissions$.pipe(
            map(userPermissions => permissions.some(permission => userPermissions.includes(permission)))
        );
    }

    /**
     * Check if user can manage users in the tenant
     *
     * @param tenant The tenant
     * @returns Observable<boolean> Whether user can manage users
     */
    canManageTenantUsers$(tenant?: Tenant): Observable<boolean> {
        return this.hasPermission$(Permission.TENANT_MANAGE_USERS);
    }

    /**
     * Check if user can create workspaces in the tenant
     *
     * @param tenant The tenant
     * @returns Observable<boolean> Whether user can create workspaces
     */
    canCreateWorkspaces$(tenant?: Tenant): Observable<boolean> {
        return this.hasPermission$(Permission.TENANT_CREATE_WORKSPACES);
    }

    /**
     * Check if user can manage workspace settings
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can manage workspace
     */
    canManageWorkspace$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_MANAGE);
    }

    /**
     * Check if user can create boards in workspace
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can create boards
     */
    canCreateBoards$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_CREATE_BOARDS);
    }

    /**
     * Check if user can create tasks in board/workspace
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can create tasks
     */
    canCreateTasks$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_CREATE_TASKS);
    }

    /**
     * Check if user can assign tasks
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can assign tasks
     */
    canAssignTasks$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_ASSIGN_TASKS);
    }

    /**
     * Check if user can delete tasks
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can delete tasks
     */
    canDeleteTasks$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_DELETE_TASKS);
    }

    /**
     * Check if user can manage task watchers
     *
     * @returns Observable<boolean> Whether user can manage watchers
     */
    canManageTaskWatchers$(): Observable<boolean> {
        return this.hasPermission$(Permission.TASK_MANAGE_WATCHERS);
    }

    /**
     * Check if user can invite members to workspace
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can invite members
     */
    canInviteMembers$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_INVITE_MEMBERS);
    }

    /**
     * Check if user can remove members from workspace
     *
     * @param workspace The workspace
     * @returns Observable<boolean> Whether user can remove members
     */
    canRemoveMembers$(workspace: Workspace): Observable<boolean> {
        return this.hasPermission$(Permission.WORKSPACE_REMOVE_MEMBERS);
    }

    /**
     * Check if user can update their own profile
     *
     * @returns Observable<boolean> Whether user can update own profile
     */
    canUpdateOwnProfile$(): Observable<boolean> {
        return this.hasPermission$(Permission.USER_UPDATE_OWN_PROFILE);
    }

    /**
     * Check if user can manage their avatar
     *
     * @returns Observable<boolean> Whether user can manage avatar
     */
    canManageAvatar$(): Observable<boolean> {
        return this.hasPermission$(Permission.USER_MANAGE_AVATAR);
    }

    /**
     * Get all current permissions
     *
     * @returns Permission[] Array of current permissions
     */
    getCurrentPermissions(): Permission[] {
        return this.userPermissions$.value;
    }

    /**
     * Get permissions for a role
     *
     * @param role The role to get permissions for
     * @returns Permission[] Array of permissions for the role
     */
    getRolePermissions(role: string): Permission[] {
        return ROLE_PERMISSIONS[role] || [];
    }
}