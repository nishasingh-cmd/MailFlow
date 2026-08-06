import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappOnboardingController } from './whatsapp-onboarding.controller';

const router = Router();

router.get('/webhook', WhatsappWebhookController.verifyWebhook);
router.post('/webhook', WhatsappWebhookController.receiveWebhook);

router.use(authenticateUser);

router.get('/status', WhatsappOnboardingController.getStatus);
router.post('/connect', WhatsappOnboardingController.initConnect);
router.post('/callback', WhatsappOnboardingController.handleCallback);
router.post('/manual-connect', WhatsappOnboardingController.manualConnect);
router.post('/refresh', WhatsappOnboardingController.refresh);
router.post('/disconnect', WhatsappOnboardingController.disconnect);

router.post('/generate', WhatsappController.generate);
router.post('/draft', WhatsappController.saveDraft);
router.post('/send', WhatsappController.send);

router.get('/history', WhatsappController.getHistory);
router.get('/failed', WhatsappController.getFailedQueue);
router.post('/failed/retry', WhatsappController.retryFailed);
router.delete('/failed', WhatsappController.deleteFailed);

router.get('/stats', WhatsappController.getStats);

export default router;
