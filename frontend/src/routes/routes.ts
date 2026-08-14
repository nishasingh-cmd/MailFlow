export const ROUTES = {
  ROOT: '/',

  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  CAMPAIGNS: '/campaigns',
  CAMPAIGN_DETAIL: '/campaigns/:id',
  DELIVERY_LOGS: '/delivery-logs',
  FAILED_QUEUE: '/failed-queue',
  WHATSAPP: '/whatsapp',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding/business',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  campaigns: 'Campaigns',
  'delivery-logs': 'Delivery Logs',
  'failed-queue': 'Failed Queue',
  whatsapp: 'WhatsApp Outreach',
  analytics: 'Analytics',
  settings: 'Settings',
  'onboarding/business': 'Business Onboarding',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
};
