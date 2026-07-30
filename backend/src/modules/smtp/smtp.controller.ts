import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { SmtpService } from './smtp.service';
import { saveSmtpSchema, testSmtpSchema } from './smtp.validation';

export class SmtpController {
  /**
   * GET /api/smtp — Get user SMTP configuration
   */
  static async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const config = await SmtpService.getConfig(userId);
      res.status(200).json({ success: true, data: config });
    } catch (error: unknown) {
      console.error('[smtp.controller] getConfig error:', error);
      res.status(500).json({ error: 'Failed to fetch SMTP configuration' });
    }
  }

  /**
   * POST /api/smtp — Save/Update SMTP configuration
   */
  static async saveConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = saveSmtpSchema.parse(req.body);
      const userId = req.user!.userId;
      const config = await SmtpService.saveConfig(userId, validated);
      res
        .status(200)
        .json({ success: true, data: config, message: 'SMTP Configuration saved successfully!' });
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid SMTP settings' });
        return;
      }
      res.status(400).json({ error: err.message || 'Failed to save SMTP configuration' });
    }
  }

  /**
   * POST /api/smtp/test — Test SMTP credentials
   */
  static async testConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = testSmtpSchema.parse(req.body);
      const userId = req.user!.userId;
      const result = await SmtpService.testConnection(userId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid test parameters' });
        return;
      }
      res.status(400).json({ error: err.message || 'SMTP Connection test failed' });
    }
  }
}
