import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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
      res.status(500).json({ error: 'Failed to process forgot password request' });
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
      if (err.message === 'INVALID_RESET_TOKEN' || err.message === 'USER_NOT_FOUND') {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
}
