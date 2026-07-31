import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { AnalyticsController } from './analytics.controller';

const router = Router();

// Protect all analytics endpoints with JWT authentication
router.use(authenticateUser);

router.get('/overview', AnalyticsController.getOverview);
router.get('/export', AnalyticsController.exportReport);

export default router;
