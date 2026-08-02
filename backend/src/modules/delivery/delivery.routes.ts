import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { DeliveryController } from './delivery.controller';

const router = Router();

router.use(authenticateUser);

// Campaign sending & preview
router.get('/campaigns/:id/preview', DeliveryController.getPreview);
router.post('/campaigns/:id/send', DeliveryController.startSending);
router.post('/campaigns/:id/pause', DeliveryController.pauseSending);
router.post('/campaigns/:id/resume', DeliveryController.resumeSending);
router.post('/campaigns/:id/cancel', DeliveryController.cancelSending);
router.get('/campaigns/:id/progress', DeliveryController.getProgress);
router.post('/send-single', DeliveryController.sendSingle);

// Delivery logs & Failed Queue
router.get('/logs', DeliveryController.getDeliveryLogs);
router.get('/failed-queue', DeliveryController.getFailedQueue);
router.post('/failed-queue/retry', DeliveryController.retryFailed);
router.delete('/failed-queue', DeliveryController.deleteFailed);

export default router;
