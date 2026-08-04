/**
 * MailFlow — Phase 2: WhatsApp Business Embedded Signup
 * Onboarding Controller — thin layer, all business logic in service
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { WhatsappOnboardingService } from './whatsapp-onboarding.service';

export class WhatsappOnboardingController {
  /**
   * GET /api/whatsapp/status
   * Returns current connection status + config snapshot + app ID for SDK
   */
  static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await WhatsappOnboardingService.getStatus(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[WhatsappOnboardingController] getStatus error:', (error as Error).message);
      res.status(500).json({ success: false, error: 'Failed to load WhatsApp connection status.' });
    }
  }

  /**
   * POST /api/whatsapp/connect
   * Returns Meta App ID and SDK config needed for frontend to open the Embedded Signup popup
   */
  static async initConnect(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const config = await WhatsappOnboardingService.initConnect();
      res.status(200).json({ success: true, data: config });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[WhatsappOnboardingController] initConnect error:', err.message);
      res
        .status(400)
        .json({ success: false, error: err.message || 'Failed to initialise connection.' });
    }
  }

  /**
   * POST /api/whatsapp/callback
   * Receives OAuth code from Meta Embedded Signup (via frontend relay).
   * Exchanges code for token, stores credentials, verifies connection.
   */
  static async handleCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { code, accessToken, wabaId, phoneNumberId, redirectUri } = req.body as {
        code?: string;
        accessToken?: string;
        wabaId?: string;
        phoneNumberId?: string;
        redirectUri?: string;
      };

      if (!code && !accessToken) {
        res
          .status(400)
          .json({
            success: false,
            error: 'Either authorization code or access token is required.',
          });
        return;
      }

      console.log('[WhatsappOnboardingController] Step 2: Callback API received from frontend:', {
        userId,
        flow: accessToken ? 'direct_token' : 'code_exchange',
        tokenOrCodePrefix: (accessToken || code || '').substring(0, 10) + '...',
        wabaId: wabaId || '(from_env)',
        phoneNumberId: phoneNumberId || '(from_env)',
      });

      const config = await WhatsappOnboardingService.handleCallback(
        userId,
        code,
        accessToken,
        wabaId,
        phoneNumberId,
        redirectUri
      );

      res.status(200).json({
        success: true,
        message: '✅ WhatsApp Business connected successfully!',
        data: { config },
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[WhatsappOnboardingController] handleCallback error:', err.message);
      // Never expose stack traces or token-related details in the response
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to complete WhatsApp connection. Please try again.',
      });
    }
  }

  /**
   * POST /api/whatsapp/refresh
   * Re-fetches latest phone number & WABA details from Meta without re-auth
   */
  static async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const config = await WhatsappOnboardingService.refresh(userId);

      res.status(200).json({
        success: true,
        message: 'Connection details refreshed successfully.',
        data: { config },
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[WhatsappOnboardingController] refresh error:', err.message);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to refresh connection details.',
      });
    }
  }

  /**
   * POST /api/whatsapp/disconnect
   * Clears credentials, sets DISCONNECTED. Preserves all historical data.
   */
  static async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      await WhatsappOnboardingService.disconnect(userId);

      res.status(200).json({
        success: true,
        message: 'WhatsApp account disconnected. All message history has been preserved.',
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[WhatsappOnboardingController] disconnect error:', err.message);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to disconnect WhatsApp account.',
      });
    }
  }
}
