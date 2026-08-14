import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { DashboardController } from './dashboard.controller';

const router = Router();

router.use(authenticateUser);

router.get('/', DashboardController.getDashboard);

export default router;
