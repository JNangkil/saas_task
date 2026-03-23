import { Outlet, Navigate } from 'react-router-dom';
import { usePermissions } from '@/services/permission.service';
import { Permission } from '@/lib/models/user.model';
import { ScreenLoader } from '@/components/common/screen-loader';

interface RequirePermissionProps {
  permissions: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, ANY permission is sufficient.
}

/**
 * Guard to protect routes that require specific permissions.
 * Redirects users without required permissions to the main app.
 */
export const RequirePermission = ({ permissions, requireAll = false }: RequirePermissionProps) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
