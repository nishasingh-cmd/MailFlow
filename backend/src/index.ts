import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { execSync } from 'child_process';
import { Server } from 'http';
import { env } from './config/env';
import { checkRedisConnection, closeRedisConnection } from './config/redis';
import healthRouter from './routes/health';
import authRouter from './modules/auth/auth.routes';
import userRouter from './modules/users/user.routes';
import leadsRouter from './modules/leads/leads.routes';
import researchRouter from './modules/research/research.routes';
import emailGenerationRouter from './modules/email-generation/email-generation.routes';
import campaignsRouter from './modules/campaigns/campaigns.routes';
import smtpRouter from './modules/smtp/smtp.routes';
import deliveryRouter from './modules/delivery/delivery.routes';
import whatsappRouter from './modules/whatsapp/whatsapp.routes';
import settingsRouter from './modules/settings/settings.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import { DeliveryWorker } from './modules/delivery/delivery.worker';
import { WhatsappWorker } from './modules/whatsapp/whatsapp.worker';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      smtp: '/api/smtp',
      delivery: '/api/delivery',
      whatsapp: '/api/whatsapp',
      settings: '/api/settings',
      analytics: '/api/analytics',
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
app.use('/api/smtp', smtpRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/analytics', analyticsRouter);

let server: Server | null = null;
let isBootstrapping = false;
let isShuttingDown = false;

function logPortOwner(port: number) {
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `netstat -ano | findstr :${port}` : `lsof -i :${port}`;
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    if (output) {
      console.error(`[server] Active process(es) bound to port ${port}:\n${output}`);
    }
  } catch {
    // ignore lookup errors if no process is listening
  }
}

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[server] Signal ${signal} received. Initiating graceful shutdown...`);

  // 1. Stop worker background timers
  try {
    DeliveryWorker.stopWorker();
    WhatsappWorker.stopWorker();
  } catch (err) {
    console.error('[server] Error stopping background workers:', err);
  }

  // 2. Disconnect Redis
  try {
    await closeRedisConnection();
  } catch {
    // ignore Redis disconnect errors
  }

  // 3. Close HTTP Server
  if (server) {
    server.close(() => {
      console.log('[server] Express HTTP server closed successfully.');
      process.exit(0);
    });

    // Unref timer so it does not block exit if server closes faster
    setTimeout(() => {
      console.warn('[server] Forcefully exiting after shutdown timeout.');
      process.exit(0);
    }, 1500).unref();
  } else {
    process.exit(0);
  }
}

// Register process signal listeners (SIGUSR2 is emitted by ts-node-dev on restart)
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function bootstrap() {
  if (isBootstrapping) {
    console.warn('[bootstrap] Bootstrap already in progress. Skipping duplicate execution.');
    return;
  }
  isBootstrapping = true;

  // Verify Redis connectivity on startup (non-fatal in development)
  const redisOk = await checkRedisConnection();
  if (!redisOk && env.NODE_ENV === 'production') {
    console.error('[bootstrap] Redis connection required in production. Exiting.');
    process.exit(1);
  }

  // Start background email & whatsapp queue workers
  DeliveryWorker.startWorker(3000);
  WhatsappWorker.startWorker(2500);

  server = app.listen(env.PORT, () => {
    console.log(`[server] MailFlow backend running on http://localhost:${env.PORT}`);
    console.log(`[server] Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] FATAL: Port ${env.PORT} is already in use (EADDRINUSE).`);
      logPortOwner(env.PORT);
      process.exit(1);
    } else {
      console.error('[server] Unexpected HTTP server error:', err);
    }
  });
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Fatal error during startup:', err);
  process.exit(1);
});

export default app;
