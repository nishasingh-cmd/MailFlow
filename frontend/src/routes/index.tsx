import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';

// App Pages
import Dashboard from '../pages/dashboard/Dashboard';
import Leads from '../pages/leads/Leads';
import Campaigns from '../pages/campaigns/Campaigns';
import Analytics from '../pages/analytics/Analytics';
import Settings from '../pages/settings/Settings';

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Auth Routes ── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      </Route>

      {/* ── Protected Application Routes ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.LEADS} element={<Leads />} />
          <Route path={ROUTES.CAMPAIGNS} element={<Campaigns />} />
          <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
        </Route>
      </Route>

      {/* ── Default Redirects ── */}
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
