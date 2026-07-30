import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { WhatsappController } from './whatsapp.controller';

const router = Router();

router.use(authenticateUser);

router.post('/generate', WhatsappController.generate);
router.post('/draft', WhatsappController.saveDraft);
router.post('/send', WhatsappController.send);

router.get('/history', WhatsappController.getHistory);
router.get('/failed', WhatsappController.getFailedQueue);
router.post('/failed/retry', WhatsappController.retryFailed);
router.delete('/failed', WhatsappController.deleteFailed);

router.get('/stats', WhatsappController.getStats);

export default router;
