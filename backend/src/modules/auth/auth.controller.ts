import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyCodeSchema,
  resendVerificationSchema,
} from './auth.validation';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(
        validated.name,
        validated.email,
        validated.password
      );
      res.status(201).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      if (err.message === 'EMAIL_EXISTS') {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      console.error('[auth.controller] Register error:', error);
      res.status(500).json({ error: 'Failed to register account' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.email, validated.password);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      if (err.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        const userEmail = (err as unknown as { userEmail?: string }).userEmail;
        res.status(403).json({
          error: 'Please verify your email before logging in.',
          requiresVerification: true,
          email: userEmail,
        });
        return;
      }
      console.error('[auth.controller] Login error:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const validated = refreshSchema.parse(req.body);
      const result = await AuthService.refresh(validated.refreshToken);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      if (err.message === 'INVALID_REFRESH_TOKEN') {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to log out' });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validated.email);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      console.error('[auth.controller] Forgot password error:', err.message);
      res.status(500).json({
        error: err.message || 'Failed to process password reset request. Please try again later.',
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validated.token, validated.password);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      if (err.message === 'TOKEN_EXPIRED') {
        res.status(400).json({
          error: 'This password reset link has expired. Please request a new one.',
        });
        return;
      }
      if (err.message === 'INVALID_RESET_TOKEN' || err.message === 'USER_NOT_FOUND') {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  static async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const validated = verifyCodeSchema.parse(req.body);
      const result = await AuthService.verifyCode(validated.email, validated.code);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        message?: string;
        errors?: { message?: string }[];
        attemptsRemaining?: number;
      };
      if (err.name === 'ZodError') {
        res.status(400).json({
          error: err.errors?.[0]?.message ?? 'Invalid verification request',
          code: 'INVALID_REQUEST',
        });
        return;
      }
      if (err.message === 'TOO_MANY_ATTEMPTS') {
        res.status(429).json({
          error: 'Maximum verification attempts exceeded. Please request a new verification code.',
          code: 'TOO_MANY_ATTEMPTS',
        });
        return;
      }
      if (err.message === 'CODE_EXPIRED') {
        res.status(400).json({
          error: 'This verification code has expired. Please request a new code.',
          code: 'CODE_EXPIRED',
        });
        return;
      }
      if (err.message === 'NO_ACTIVE_CODE') {
        res.status(400).json({
          error: 'No active verification code found for this account. Please request a new code.',
          code: 'NO_ACTIVE_CODE',
        });
        return;
      }
      if (err.message === 'INVALID_CODE') {
        res.status(400).json({
          error: 'Invalid verification code. Please check your email and try again.',
          code: 'INVALID_CODE',
        });
        return;
      }
      if (err.attemptsRemaining !== undefined) {
        res.status(400).json({
          error: err.message,
          code: 'INVALID_CODE',
          attemptsRemaining: err.attemptsRemaining,
        });
        return;
      }
      console.error('[auth.controller] Verify code error:', error);
      res.status(500).json({ error: 'Failed to verify email address' });
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      // If code & email are present in body, route to verifyCode
      if (req.body?.code && req.body?.email) {
        const validated = verifyCodeSchema.parse(req.body);
        const result = await AuthService.verifyCode(validated.email, validated.code);
        res.status(200).json(result);
        return;
      }

      const token = (req.query.token as string) || req.body?.token;
      const validated = verifyEmailSchema.parse({ token });
      const result = await AuthService.verifyEmail(validated.token);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        message?: string;
        errors?: { message?: string }[];
        attemptsRemaining?: number;
      };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid verification request' });
        return;
      }
      if (err.message === 'TOO_MANY_ATTEMPTS') {
        res.status(429).json({
          error: 'Maximum verification attempts exceeded. Please request a new verification code.',
          code: 'TOO_MANY_ATTEMPTS',
        });
        return;
      }
      if (err.message === 'CODE_EXPIRED' || err.message === 'TOKEN_EXPIRED') {
        res.status(400).json({
          error: 'This verification has expired. Please request a new one.',
          code: 'EXPIRED',
        });
        return;
      }
      if (
        err.message === 'INVALID_TOKEN' ||
        err.message === 'USER_NOT_FOUND' ||
        err.message === 'INVALID_CODE'
      ) {
        res.status(400).json({
          error: 'Invalid verification details.',
          code: 'INVALID',
        });
        return;
      }
      if (err.attemptsRemaining !== undefined) {
        res.status(400).json({
          error: err.message,
          code: 'INVALID_CODE',
          attemptsRemaining: err.attemptsRemaining,
        });
        return;
      }
      console.error('[auth.controller] Verify email error:', error);
      res.status(500).json({ error: 'Failed to verify email address' });
    }
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const validated = resendVerificationSchema.parse(req.body);
      const result = await AuthService.resendVerification(validated.email);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request data' });
        return;
      }
      console.error('[auth.controller] Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
}
