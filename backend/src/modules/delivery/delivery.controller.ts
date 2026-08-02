import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { DeliveryService } from './delivery.service';

export class DeliveryController {
  /**
   * GET /api/delivery/campaigns/:id/preview — Preview personalized email for campaign lead
   */
  static async getPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { leadId } = req.query as { leadId?: string };
      const userId = req.user!.userId;
      const preview = await DeliveryService.getCampaignPreview(userId, id, leadId);
      res.status(200).json({ success: true, data: preview });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      res.status(400).json({ error: err.message || 'Failed to generate email preview' });
    }
  }

  /**
   * POST /api/delivery/campaigns/:id/send — Start sending campaign
   */
  static async startSending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const progress = await DeliveryService.startSending(userId, id);
      res
        .status(200)
        .json({ success: true, data: progress, message: 'Campaign queued and sending started.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      res.status(400).json({ error: err.message || 'Failed to start sending campaign' });
    }
  }

  /**
   * POST /api/delivery/campaigns/:id/pause — Pause sending campaign
   */
  static async pauseSending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const progress = await DeliveryService.pauseSending(userId, id);
      res.status(200).json({ success: true, data: progress, message: 'Campaign sending paused.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to pause campaign' });
    }
  }

  /**
   * POST /api/delivery/campaigns/:id/resume — Resume sending campaign
   */
  static async resumeSending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const progress = await DeliveryService.resumeSending(userId, id);
      res.status(200).json({ success: true, data: progress, message: 'Campaign sending resumed.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to resume campaign' });
    }
  }

  /**
   * POST /api/delivery/campaigns/:id/cancel — Cancel sending campaign
   */
  static async cancelSending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const progress = await DeliveryService.cancelSending(userId, id);
      res
        .status(200)
        .json({ success: true, data: progress, message: 'Campaign sending cancelled.' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to cancel campaign' });
    }
  }

  /**
   * GET /api/delivery/campaigns/:id/progress — Get campaign live progress
   */
  static async getProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const progress = await DeliveryService.getCampaignProgress(userId, id);
      res.status(200).json({ success: true, data: progress });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to fetch campaign progress' });
    }
  }

  /**
   * GET /api/delivery/logs — Get paginated delivery logs
   */
  static async getDeliveryLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { search, status, campaignId, page, limit } = req.query as {
        search?: string;
        status?: string;
        campaignId?: string;
        page?: string;
        limit?: string;
      };

      const result = await DeliveryService.getDeliveryLogs(userId, {
        search,
        status,
        campaignId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[delivery.controller] getDeliveryLogs error:', error);
      res.status(500).json({ error: 'Failed to fetch delivery logs' });
    }
  }

  /**
   * GET /api/delivery/failed-queue — Get failed email jobs
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

      const result = await DeliveryService.getFailedQueue(userId, {
        search,
        campaignId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[delivery.controller] getFailedQueue error:', error);
      res.status(500).json({ error: 'Failed to fetch failed queue' });
    }
  }

  /**
   * POST /api/delivery/failed-queue/retry — Retry failed jobs (selected or all)
   */
  static async retryFailed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { jobIds } = req.body as { jobIds?: string[] };
      const result = await DeliveryService.retryFailedJobs(userId, jobIds);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      console.error('[delivery.controller] retryFailed error:', error);
      res.status(500).json({ error: 'Failed to retry selected jobs' });
    }
  }

  /**
   * DELETE /api/delivery/failed-queue — Delete failed jobs (selected or all)
   */
  static async deleteFailed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { jobIds } = req.body as { jobIds?: string[] };
      const result = await DeliveryService.deleteFailedJobs(userId, jobIds);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      console.error('[delivery.controller] deleteFailed error:', error);
      res.status(500).json({ error: 'Failed to delete failed queue jobs' });
    }
  }

  /**
   * POST /api/delivery/send-single — Send a single email directly to a lead
   */
  static async sendSingle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { leadId, subject, body } = req.body as {
        leadId: string;
        subject: string;
        body: string;
      };

      if (!leadId || !subject || !body) {
        res.status(400).json({ error: 'leadId, subject, and body are required' });
        return;
      }

      const result = await DeliveryService.sendSingleEmail(userId, { leadId, subject, body });
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to send email' });
    }
  }
}
