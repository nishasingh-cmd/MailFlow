import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { SettingsService } from './settings.service';

export class SettingsController {
  /**
   * GET /api/settings — Load unified workspace settings envelope
   */
  static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await SettingsService.getSettingsEnvelope(userId);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      console.error('[SettingsController] getSettings error:', error);
      res.status(500).json({ error: 'Failed to load workspace settings' });
    }
  }

  /**
   * PUT /api/settings/profile — Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await SettingsService.updateProfile(userId, req.body);
      res.status(200).json({ success: true, data: user, message: 'Profile updated successfully.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  }

  /**
   * PUT /api/settings/security — Change user password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await SettingsService.changePassword(userId, req.body);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to change password' });
    }
  }

  /**
   * POST /api/settings/ai — Save AI Config
   */
  static async saveAiConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await SettingsService.saveAiConfig(userId, req.body);
      res
        .status(200)
        .json({ success: true, data, message: 'AI configuration saved successfully.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to save AI configuration' });
    }
  }

  /**
   * POST /api/settings/ai/test — Test AI API key connection
   */
  static async testAiConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await SettingsService.testAiConnection(userId, req.body);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to test AI connection' });
    }
  }

  /**
   * POST /api/settings/whatsapp — Save Meta WhatsApp Cloud API settings
   */
  static async saveWhatsappConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await SettingsService.saveWhatsappConfig(userId, req.body);
      res.status(200).json({ success: true, data, message: 'WhatsApp configuration saved.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to save WhatsApp configuration' });
    }
  }

  /**
   * POST /api/settings/whatsapp/test — Test WhatsApp Connection
   */
  static async testWhatsappConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await SettingsService.testWhatsappConnection(userId);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to test WhatsApp connection' });
    }
  }

  /**
   * POST /api/settings/whatsapp/reset — Reset WhatsApp Configuration to Mock Mode
   */
  static async resetWhatsappConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await SettingsService.resetWhatsappConfig(userId);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to reset WhatsApp configuration' });
    }
  }

  /**
   * PUT /api/settings/preferences — Save Application Preferences
   */
  static async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await SettingsService.updatePreferences(userId, req.body);
      res.status(200).json({ success: true, data, message: 'Preferences updated successfully.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to update preferences' });
    }
  }
}
