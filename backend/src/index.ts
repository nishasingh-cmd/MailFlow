/**
 * MailFlow Backend — Express entry point.
 * Phase 1: Project Foundation
 *
 * Only the health-check route is registered here.
 * Auth middleware, business routes, and queue setup will be added in subsequent phases
 * per the Technical Architecture Document.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { checkRedisConnection } from './config/redis';
import healthRouter from './routes/health';

const app = express();

// ── Security & parsing middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);

// ── Start server ───────────────────────────────────────────────────────────────
async function bootstrap() {
  // Verify Redis connectivity on startup (non-fatal in development)
  const redisOk = await checkRedisConnection();
  if (!redisOk && env.NODE_ENV === 'production') {
    console.error('[bootstrap] Redis connection required in production. Exiting.');
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`[server] MailFlow backend running on http://localhost:${env.PORT}`);
    console.log(`[server] Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Fatal error during startup:', err);
  process.exit(1);
});

export default app;
