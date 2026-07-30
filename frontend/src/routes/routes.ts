/**
 * Route path constants — single source of truth for all app routes.
 * Import from here instead of hardcoding strings.
 */
export const ROUTES = {
  // Root
  ROOT: '/',

  // Public / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Protected App
  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  CAMPAIGNS: '/campaigns',
  CAMPAIGN_DETAIL: '/campaigns/:id',
  DELIVERY_LOGS: '/delivery-logs',
  FAILED_QUEUE: '/failed-queue',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Human-readable labels mapped to route paths (for breadcrumbs etc.) */
export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  campaigns: 'Campaigns',
  'delivery-logs': 'Delivery Logs',
  'failed-queue': 'Failed Queue',
  analytics: 'Analytics',
  settings: 'Settings',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
};
