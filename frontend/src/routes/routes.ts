export const ROUTES = {
  ROOT: '/',

  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  CAMPAIGNS: '/campaigns',
  CAMPAIGNS_CREATE: '/campaigns/addcampaign',
  CAMPAIGN_DETAIL: '/campaigns/:id',
  FAILED_QUEUE: '/failed-queue',
  WHATSAPP: '/whatsapp',
  EMAIL_OUTREACH: '/email-outreach',
  TEMPLATES: '/templates',
  TEMPLATES_CREATE: '/templates/addtemplate',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding/business',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  campaigns: 'Campaigns',
  'failed-queue': 'Failed Queue',
  whatsapp: 'WhatsApp Outreach',
  'email-outreach': 'Email Outreach',
  templates: 'Templates',
  settings: 'Settings',
  'onboarding/business': 'Business Onboarding',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  'verify-email': 'Verify Email',
};
