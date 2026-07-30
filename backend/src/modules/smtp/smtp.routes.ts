import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { SmtpController } from './smtp.controller';

const router = Router();

router.use(authenticateUser);

router.get('/', SmtpController.getConfig);
router.post('/', SmtpController.saveConfig);
router.post('/test', SmtpController.testConnection);

export default router;
