import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { ScreenLoader } from '@/components/common/screen-loader';

/**
 * Guard to protect routes that require admin role.
 * Redirects non-admin users to the main app.
 */
export const RequireAdmin = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
