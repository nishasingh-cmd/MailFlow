import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CampaignsService } from './campaigns.service';
import {
  createCampaignSchema,
  updateCampaignSchema,
  queryCampaignsSchema,
} from './campaigns.validation';

export class CampaignsController {
  /**
   * POST /campaigns — Create a new campaign
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createCampaignSchema.parse(req.body);
      const userId = req.user!.userId;
      const campaign = await CampaignsService.createCampaign(userId, validated);
      res.status(201).json({ success: true, data: campaign });
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid campaign data' });
        return;
      }
      console.error('[campaigns.controller] Create error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  /**
   * GET /campaigns — List campaigns (paginated + filtered)
   */
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = queryCampaignsSchema.parse(req.query);
      const userId = req.user!.userId;
      const result = await CampaignsService.getCampaigns(userId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid query parameters' });
        return;
      }
      console.error('[campaigns.controller] List error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  /**
   * GET /campaigns/:id — Get campaign detail
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const campaign = await CampaignsService.getCampaignById(userId, id);
      res.status(200).json({ success: true, data: campaign });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      console.error('[campaigns.controller] Get by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }

  /**
   * PATCH /campaigns/:id — Update campaign
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateCampaignSchema.parse(req.body);
      const userId = req.user!.userId;
      const campaign = await CampaignsService.updateCampaign(userId, id, validated);
      res.status(200).json({ success: true, data: campaign });
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid update data' });
        return;
      }
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      console.error('[campaigns.controller] Update error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  /**
   * DELETE /campaigns/:id — Delete campaign (never deletes leads)
   */
  static async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const result = await CampaignsService.deleteCampaign(userId, id);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      console.error('[campaigns.controller] Delete error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  /**
   * POST /campaigns/:id/duplicate — Duplicate a campaign
   */
  static async duplicate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const campaign = await CampaignsService.duplicateCampaign(userId, id);
      res.status(201).json({ success: true, data: campaign });
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'CAMPAIGN_NOT_FOUND') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      console.error('[campaigns.controller] Duplicate error:', error);
      res.status(500).json({ error: 'Failed to duplicate campaign' });
    }
  }
}
