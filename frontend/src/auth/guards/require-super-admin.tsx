import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { ScreenLoader } from '@/components/common/screen-loader';

/**
 * Guard to protect routes that require super admin role.
 * Redirects non-super-admin users to the main app.
 */
export const RequireSuperAdmin = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  if (!user?.is_super_admin) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
