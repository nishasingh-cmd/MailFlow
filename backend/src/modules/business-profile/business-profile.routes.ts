import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { BusinessProfileController } from './business-profile.controller';

const router = Router();

router.use(authenticateUser);

router.get('/', BusinessProfileController.getProfile);
router.post('/', BusinessProfileController.createProfile);
router.patch('/', BusinessProfileController.updateProfile);
router.get('/context', BusinessProfileController.getBusinessContext);

export default router;
