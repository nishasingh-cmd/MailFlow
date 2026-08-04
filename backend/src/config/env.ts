/**
 * Environment variable loader and validator.
 * All required env vars are validated at startup — the app will exit early
 * with a clear error message if any are missing.
 */
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
} as const;
