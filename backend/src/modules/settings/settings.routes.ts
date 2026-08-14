import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { SettingsController } from './settings.controller';
import { BusinessProfileController } from '../business-profile/business-profile.controller';

const router = Router();

router.use(authenticateUser);

router.get('/', SettingsController.getSettings);
router.put('/profile', SettingsController.updateProfile);
router.put('/security', SettingsController.changePassword);

router.get('/business-profile', BusinessProfileController.getProfile);
router.post('/business-profile', BusinessProfileController.createProfile);
router.put('/business-profile', BusinessProfileController.updateProfile);
router.patch('/business-profile', BusinessProfileController.updateProfile);

router.post('/ai', SettingsController.saveAiConfig);
router.post('/ai/test', SettingsController.testAiConnection);

router.post('/whatsapp', SettingsController.saveWhatsappConfig);
router.post('/whatsapp/test', SettingsController.testWhatsappConnection);
router.post('/whatsapp/reset', SettingsController.resetWhatsappConfig);

router.put('/preferences', SettingsController.updatePreferences);

export default router;
