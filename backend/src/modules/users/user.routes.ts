import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateUser } from '../../middleware/auth.middleware';

const router = Router();

router.get('/profile', authenticateUser, UserController.getProfile);
router.patch('/profile', authenticateUser, UserController.updateProfile);

export default router;
