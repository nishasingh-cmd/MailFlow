import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { WhatsappGeneratorService } from './whatsapp-generator.service';
import { WhatsappService } from './whatsapp.service';

export class WhatsappController {
  /**
   * POST /api/whatsapp/generate — Generate AI WhatsApp message for a lead
   */
  static async generate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId, campaignObjective, cta } = req.body as {
        leadId: string;
        campaignObjective?: string;
        cta?: string;
      };
      const userId = req.user!.userId;

      if (!leadId) {
        res.status(400).json({ error: 'Lead ID is required' });
        return;
      }

      const generated = await WhatsappGeneratorService.generateMessage(
        userId,
        leadId,
        campaignObjective,
        cta
      );

      res.status(200).json({ success: true, data: generated });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to generate WhatsApp message' });
    }
  }

  /**
   * POST /api/whatsapp/draft — Save/update WhatsApp draft
   */
  static async saveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId, campaignId, message } = req.body as {
        leadId: string;
        campaignId?: string;
        message: string;
      };
      const userId = req.user!.userId;

      if (!leadId || !message) {
        res.status(400).json({ error: 'Lead ID and message are required' });
        return;
      }

      const draft = await WhatsappService.saveDraft(userId, { leadId, campaignId, message });
      res
        .status(200)
        .json({ success: true, data: draft, message: 'WhatsApp draft saved successfully.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to save draft' });
    }
  }

  /**
   * POST /api/whatsapp/send — Enqueue & send WhatsApp messages (Individual, Selected, All)
   */
  static async send(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { leadIds, campaignId, message, sendAll } = req.body as {
        leadIds?: string[];
        campaignId?: string;
        message?: string;
        sendAll?: boolean;
      };

      console.log(
        `[API] Received WhatsApp send request | User ID: ${userId} | leadIds: ${JSON.stringify(
          leadIds || []
        )} | campaignId: ${campaignId || 'N/A'} | sendAll: ${!!sendAll}`
      );

      const result = await WhatsappService.enqueueMessages(userId, {
        leadIds,
        campaignId,
        message,
        sendAll,
      });

      if (!result || result.count === 0) {
        console.warn(`[API] Enqueue returned 0 queued messages for user ${userId}.`);
        res.status(400).json({
          success: false,
          error: 'No WhatsApp messages were queued. Please check recipient lead phone numbers.',
        });
        return;
      }

      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[API] WhatsApp send controller exception:', err.stack || err);
      res
        .status(400)
        .json({ success: false, error: err.message || 'Failed to send WhatsApp messages' });
    }
  }

  /**
   * GET /api/whatsapp/history — Paginated WhatsApp delivery logs
   */
  static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { search, status, campaignId, page, limit } = req.query as {
        search?: string;
        status?: string;
        campaignId?: string;
        page?: string;
        limit?: string;
      };

      const result = await WhatsappService.getWhatsappHistory(userId, {
        search,
        status,
        campaignId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] getHistory error:', error);
      res.status(500).json({ error: 'Failed to fetch WhatsApp history' });
    }
  }

  /**
   * GET /api/whatsapp/failed — Get failed WhatsApp queue items
   */
  static async getFailedQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { search, campaignId, page, limit } = req.query as {
        search?: string;
        campaignId?: string;
        page?: string;
        limit?: string;
      };

      const result = await WhatsappService.getFailedQueue(userId, {
        search,
        campaignId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] getFailedQueue error:', error);
      res.status(500).json({ error: 'Failed to fetch failed queue' });
    }
  }

  /**
   * POST /api/whatsapp/failed/retry — Retry failed jobs
   */
  static async retryFailed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { jobIds } = req.body as { jobIds?: string[] };
      const result = await WhatsappService.retryFailedJobs(userId, jobIds);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] retryFailed error:', error);
      res.status(500).json({ error: 'Failed to retry selected jobs' });
    }
  }

  /**
   * DELETE /api/whatsapp/failed — Delete failed jobs
   */
  static async deleteFailed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { jobIds } = req.body as { jobIds?: string[] };
      const result = await WhatsappService.deleteFailedJobs(userId, jobIds);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] deleteFailed error:', error);
      res.status(500).json({ error: 'Failed to delete failed queue jobs' });
    }
  }

  /**
   * GET /api/whatsapp/stats — WhatsApp metrics
   */
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await WhatsappService.getStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] getStats error:', error);
      res.status(500).json({ error: 'Failed to fetch WhatsApp stats' });
    }
  }
}
