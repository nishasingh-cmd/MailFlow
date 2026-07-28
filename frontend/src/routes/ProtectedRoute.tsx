import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from './routes';

/**
 * ProtectedRoute — gates access to authenticated app routes.
 *
 * Phase 3: uses a localStorage flag ('mailflow-auth') as a mock auth check.
 * Phase 4 will replace this with real JWT / session validation.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('mailflow-auth') === 'true';

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
