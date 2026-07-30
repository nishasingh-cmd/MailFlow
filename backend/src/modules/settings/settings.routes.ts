import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { SettingsController } from './settings.controller';

const router = Router();

router.use(authenticateUser);

router.get('/', SettingsController.getSettings);
router.put('/profile', SettingsController.updateProfile);
router.put('/security', SettingsController.changePassword);

router.post('/ai', SettingsController.saveAiConfig);
router.post('/ai/test', SettingsController.testAiConnection);

router.post('/whatsapp', SettingsController.saveWhatsappConfig);
router.post('/whatsapp/test', SettingsController.testWhatsappConnection);

router.put('/preferences', SettingsController.updatePreferences);

export default router;
