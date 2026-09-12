import { Router } from 'express';
import { TrackingController } from './tracking.controller';

const router = Router();

// Public endpoints accessible without authentication for mail clients loading pixel
router.get('/open/:logId', TrackingController.handleOpen);
router.get('/open/:logId.png', TrackingController.handleOpen);

// Public endpoint for smart link click tracking
router.get('/click/:logId', TrackingController.handleClick);

export default router;
