import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { Permission, ROLE_PERMISSIONS } from '@/lib/models/user.model';

/**
 * Permission Service for checking user permissions
 */
class PermissionServiceClass {
  private userPermissions$ = new BehaviorSubject<Permission[]>([]);
  
  /**
   * Get current permissions as observable
   */
  get userPermissions() {
    return this.userPermissions$.asObservable();
  }

  /**
   * Get current permissions value
   */
  getCurrentPermissions(): Permission[] {
    return this.userPermissions$.value;
  }

  /**
   * Set user permissions (typically called after login or tenant switch)
   */
  setUserRole(role: string): void {
    const permissions = ROLE_PERMISSIONS[role] || [];
    this.userPermissions$.next(permissions);
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    return this.userPermissions$.value.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if user can manage users in the tenant
   */
  canManageUsers(): boolean {
    return this.hasPermission(Permission.TENANT_MANAGE_USERS);
  }

  /**
   * Check if user can create workspaces in the tenant
   */
  canCreateWorkspaces(): boolean {
    return this.hasPermission(Permission.TENANT_CREATE_WORKSPACES);
  }

  /**
   * Check if user can manage workspace settings
   */
  canManageWorkspace(): boolean {
    return this.hasPermission(Permission.WORKSPACE_MANAGE);
  }

  /**
   * Check if user can create boards in workspace
   */
  canCreateBoards(): boolean {
    return this.hasPermission(Permission.WORKSPACE_CREATE_BOARDS);
  }

  /**
   * Check if user can create tasks in board/workspace
   */
  canCreateTasks(): boolean {
    return this.hasPermission(Permission.WORKSPACE_CREATE_TASKS);
  }

  /**
   * Check if user can assign tasks
   */
  canAssignTasks(): boolean {
    return this.hasPermission(Permission.WORKSPACE_ASSIGN_TASKS);
  }

  /**
   * Check if user can delete tasks
   */
  canDeleteTasks(): boolean {
    return this.hasPermission(Permission.WORKSPACE_DELETE_TASKS);
  }

  /**
   * Check if user can manage task watchers
   */
  canManageTaskWatchers(): boolean {
    return this.hasPermission(Permission.TASK_MANAGE_WATCHERS);
  }

  /**
   * Check if user can invite members to workspace
   */
  canInviteMembers(): boolean {
    return this.hasPermission(Permission.WORKSPACE_INVITE_MEMBERS);
  }

  /**
   * Check if user can remove members from workspace
   */
  canRemoveMembers(): boolean {
    return this.hasPermission(Permission.WORKSPACE_REMOVE_MEMBERS);
  }

  /**
   * Check if user can update their own profile
   */
  canUpdateOwnProfile(): boolean {
    return this.hasPermission(Permission.USER_UPDATE_OWN_PROFILE);
  }

  /**
   * Check if user can manage their avatar
   */
  canManageAvatar(): boolean {
    return this.hasPermission(Permission.USER_MANAGE_AVATAR);
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(role: string): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}

export const permissionService = new PermissionServiceClass();

/**
 * Permission Context
 */
interface PermissionContextValue {
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  can: (permission: Permission) => boolean;
  setRole: (role: string) => void;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  initialRole?: string;
}

export function PermissionProvider({ children, initialRole }: PermissionProviderProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (initialRole) {
      const rolePermissions = permissionService.getRolePermissions(initialRole);
      setPermissions(rolePermissions);
      permissionService.setUserRole(initialRole);
    }
  }, [initialRole]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const can = (permission: Permission): boolean => {
    return hasPermission(permission);
  };

  const setRole = (role: string) => {
    const rolePermissions = permissionService.getRolePermissions(role);
    setPermissions(rolePermissions);
    permissionService.setUserRole(role);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        can,
        setRole,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to use permission context
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}
