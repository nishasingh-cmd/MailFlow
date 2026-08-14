import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/ui/Loader/Loader';
import { ROUTES } from './routes';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader label="Verifying session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const isOnboardingRoute = location.pathname === ROUTES.ONBOARDING;

  // If user has not completed onboarding and is attempting to access protected app routes
  if (user && user.hasBusinessProfile === false && !isOnboardingRoute) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  // If user has already completed onboarding and tries to visit onboarding page
  if (user && user.hasBusinessProfile === true && isOnboardingRoute) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}
