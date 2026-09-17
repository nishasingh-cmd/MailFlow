import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyEmail from '../pages/auth/VerifyEmail';

import Dashboard from '../pages/dashboard/Dashboard';
import Leads from '../pages/leads/Leads';
import Campaigns from '../pages/campaigns/Campaigns';
import CampaignDetail from '../pages/campaigns/CampaignDetail';
import CreateCampaignPage from '../pages/campaigns/CreateCampaignPage';
import FailedQueuePage from '../pages/delivery/FailedQueuePage';
import WhatsappPage from '../pages/whatsapp/WhatsappPage';
import EmailOutreachPage from '../pages/email/EmailOutreachPage';
import TemplatesPage from '../pages/templates/TemplatesPage';
import CreateTemplatePage from '../pages/templates/CreateTemplatePage';
import Settings from '../pages/settings/Settings';
import BusinessOnboarding from '../pages/onboarding/BusinessOnboarding';
import PrivacyPolicy from '../pages/legal/PrivacyPolicy';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
      </Route>

      <Route path="/privacy" element={<PrivacyPolicy />} />

      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.ONBOARDING} element={<BusinessOnboarding />} />

        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.LEADS} element={<Leads />} />
          <Route path={ROUTES.CAMPAIGNS} element={<Campaigns />} />
          <Route path={ROUTES.CAMPAIGNS_CREATE} element={<CreateCampaignPage />} />
          <Route
            path="/campaigns/create"
            element={<Navigate to={ROUTES.CAMPAIGNS_CREATE} replace />}
          />
          <Route path={ROUTES.CAMPAIGN_DETAIL} element={<CampaignDetail />} />
          <Route path={ROUTES.FAILED_QUEUE} element={<FailedQueuePage />} />
          <Route path={ROUTES.EMAIL_OUTREACH} element={<EmailOutreachPage />} />
          <Route path={ROUTES.WHATSAPP} element={<WhatsappPage />} />
          <Route path={ROUTES.TEMPLATES} element={<TemplatesPage />} />
          <Route path={ROUTES.TEMPLATES_CREATE} element={<CreateTemplatePage />} />
          <Route
            path="/templates/create"
            element={<Navigate to={ROUTES.TEMPLATES_CREATE} replace />}
          />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
        </Route>
      </Route>

      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
