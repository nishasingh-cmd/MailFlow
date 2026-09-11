import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Missing required environment variable: ${name}`);
    console.error(`[config] Copy backend/.env.example to backend/.env and fill in the values.`);
    process.exit(1);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_URL: requireEnv('REDIS_URL'),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'mailflow_access_secret_dev_key_12345',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'mailflow_refresh_secret_dev_key_67890',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY ?? '',
  SERPER_API_KEY: process.env.SERPER_API_KEY ?? '',
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER ?? 'MOCK',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
  WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v25.0',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN:
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'mailflow_verify_token',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ?? '',
  WHATSAPP_APP_ID: process.env.WHATSAPP_APP_ID ?? '',
  WHATSAPP_CONFIG_ID: process.env.WHATSAPP_CONFIG_ID ?? '',
  WHATSAPP_REDIRECT_URI: process.env.WHATSAPP_REDIRECT_URI ?? '',
  WHATSAPP_DEFAULT_TEMPLATE_NAME: process.env.WHATSAPP_DEFAULT_TEMPLATE_NAME ?? 'cold_outreach',
  FRONTEND_URL: (process.env.FRONTEND_URL ?? 'https://localhost:5173').replace(
    'http://localhost:5173',
    'https://localhost:5173'
  ),
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME ?? 'MailFlow',
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
} as const;
