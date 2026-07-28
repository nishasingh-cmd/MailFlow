import { Router } from 'express';
import type { Request, Response } from 'express';
import type { HealthCheckResponse } from '@mailflow/shared';

const router = Router();

/**
 * GET /api/health
 * Basic liveness check — confirms the Express server is running.
 */
router.get('/', (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(response);
});

export default router;
