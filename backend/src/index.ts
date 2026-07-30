/**
 * MailFlow Backend — Express entry point.
 * Phase 8: Campaign Management
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { checkRedisConnection } from './config/redis';
import healthRouter from './routes/health';
import authRouter from './modules/auth/auth.routes';
import userRouter from './modules/users/user.routes';
import leadsRouter from './modules/leads/leads.routes';
import researchRouter from './modules/research/research.routes';
import emailGenerationRouter from './modules/email-generation/email-generation.routes';
import campaignsRouter from './modules/campaigns/campaigns.routes';

const app = express();

// ── Security & parsing middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'MailFlow API',
    status: 'online',
    healthCheck: '/api/health',
    documentation: 'See project-documentation folder for API details',
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'MailFlow API Root',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      leads: '/api/leads',
      research: '/api/research',
      emailGeneration: '/api/email-generation',
      campaigns: '/api/campaigns',
    },
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/research', researchRouter);
app.use('/api/email-generation', emailGenerationRouter);
app.use('/api/campaigns', campaignsRouter);

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
