import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateUser } from '../../middleware/auth.middleware';
import {
  forgotPasswordRateLimiter,
  resendVerificationRateLimiter,
} from '../../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticateUser, AuthController.logout);
router.post('/forgot-password', forgotPasswordRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/verify-code', AuthController.verifyCode);
router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  AuthController.resendVerification
);

export default router;
