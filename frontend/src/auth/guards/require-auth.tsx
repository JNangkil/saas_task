import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';

/**
 * Guard to protect routes that require authentication.
 * Redirects unauthenticated users to the login page.
 */
export const RequireAuth = () => {
  const { auth } = useAuth();

  if (!auth?.access_token) {
    return <Navigate to="/auth/signin" replace />;
  }

  return <Outlet />;
};
