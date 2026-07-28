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
} as const;
