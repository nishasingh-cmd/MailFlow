import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { AnalyticsController } from './analytics.controller';

const router = Router();

router.use(authenticateUser);

router.get('/overview', AnalyticsController.getOverview);
router.get('/export', AnalyticsController.exportReport);

export default router;
