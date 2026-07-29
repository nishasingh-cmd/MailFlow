/**
 * MailFlow — Research Controller
 * Phase 6: AI Company Research
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ResearchService } from './research.service';
import { researchSingleSchema, bulkResearchSchema } from './research.validation';

export class ResearchController {
  /**
   * POST /api/research/single
   * Research a single lead's company
   */
  static async researchSingle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = researchSingleSchema.parse(req.body);
      const userId = req.user!.userId;

      const result = await ResearchService.researchCompany(userId, validated.leadId);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request' });
        return;
      }
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      if (err.message?.startsWith('LEAD_NO_COMPANY')) {
        res.status(400).json({ error: 'Lead has no company name to research' });
        return;
      }
      console.error('[research.controller] Research single error:', error);
      res.status(500).json({ error: 'Failed to research company' });
    }
  }

  /**
   * POST /api/research/bulk
   * Research multiple leads' companies
   */
  static async researchBulk(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = bulkResearchSchema.parse(req.body);
      const userId = req.user!.userId;

      const result = await ResearchService.bulkResearch(userId, validated.leadIds);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid request' });
        return;
      }
      console.error('[research.controller] Bulk research error:', error);
      res.status(500).json({ error: 'Failed to run bulk research' });
    }
  }

  /**
   * POST /api/research/all
   * Research all leads for the user that have a company name
   */
  static async researchAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await ResearchService.researchAll(userId);
      res.status(200).json(result);
    } catch (error: unknown) {
      console.error('[research.controller] Research all error:', error);
      res.status(500).json({ error: 'Failed to run company research' });
    }
  }

  /**
   * GET /api/research/lead/:leadId
   * Get research result for a specific lead
   */
  static async getResearchByLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const userId = req.user!.userId;

      const result = await ResearchService.getResearchByLead(userId, leadId);
      if (!result) {
        res.status(404).json({ error: 'No research data found for this lead' });
        return;
      }
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      console.error('[research.controller] Get research error:', error);
      res.status(500).json({ error: 'Failed to fetch research data' });
    }
  }

  /**
   * POST /api/research/retry/:leadId
   * Retry failed research for a lead
   */
  static async retryResearch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const userId = req.user!.userId;

      const result = await ResearchService.retryResearch(userId, leadId);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      console.error('[research.controller] Retry research error:', error);
      res.status(500).json({ error: 'Failed to retry research' });
    }
  }

  /**
   * POST /api/research/status
   * Get research status for multiple leads (bulk status check for table display)
   */
  static async getBulkStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadIds } = req.body as { leadIds?: string[] };
      if (!leadIds || !Array.isArray(leadIds)) {
        res.status(400).json({ error: 'leadIds array is required' });
        return;
      }
      const userId = req.user!.userId;
      const result = await ResearchService.getBulkResearchStatus(userId, leadIds);
      res.status(200).json(result);
    } catch (error: unknown) {
      console.error('[research.controller] Bulk status error:', error);
      res.status(500).json({ error: 'Failed to fetch research status' });
    }
  }
}
