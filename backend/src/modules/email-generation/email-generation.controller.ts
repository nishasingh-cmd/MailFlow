/**
 * MailFlow — Email Generation Controller
 * Phase 7: AI Email Generation
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { EmailGenerationService } from './email-generation.service';
import { GenerateEmailRequest, SaveDraftRequest, UpdateDraftRequest } from '@mailflow/shared';

export class EmailGenerationController {
  /**
   * POST /api/email-generation/generate
   */
  static async generateEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const body = req.body as GenerateEmailRequest;
      if (!body.leadId) {
        res.status(400).json({ success: false, error: 'INVALID_REQUEST: leadId is required' });
        return;
      }

      const result = await EmailGenerationService.generateEmailForLead(userId, body);
      res.json({
        success: true,
        data: result,
        message: 'Personalized email generated successfully',
      });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to generate email';
      const statusCode = msg.startsWith('LEAD_NOT_FOUND')
        ? 404
        : msg.startsWith('RESEARCH_NOT_COMPLETED')
          ? 400
          : 500;

      res.status(statusCode).json({ success: false, error: msg });
    }
  }

  /**
   * POST /api/email-generation/subjects
   */
  static async generateSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const { leadId, template = 'Cold Outreach' } = req.body;
      if (!leadId) {
        res.status(400).json({ success: false, error: 'INVALID_REQUEST: leadId is required' });
        return;
      }

      const subjects = await EmailGenerationService.generateSubjectLinesForLead(
        userId,
        leadId,
        template
      );
      res.json({ success: true, data: subjects });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * POST /api/email-generation/regenerate
   */
  static async regenerateEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    return EmailGenerationController.generateEmail(req, res);
  }

  /**
   * POST /api/email-generation/drafts
   */
  static async saveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const body = req.body as SaveDraftRequest;
      if (!body.leadId || !body.subject || !body.body) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST: leadId, subject, and body are required',
        });
        return;
      }

      const draft = await EmailGenerationService.saveDraft(userId, body);
      res.json({
        success: true,
        data: draft,
        message: 'Draft saved successfully',
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * PUT /api/email-generation/drafts/:id
   */
  static async updateDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const { id } = req.params;
      const body = req.body as UpdateDraftRequest;

      const updated = await EmailGenerationService.updateDraft(userId, id, body);
      res.json({
        success: true,
        data: updated,
        message: 'Draft updated successfully',
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * GET /api/email-generation/drafts/:id
   */
  static async getDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const { id } = req.params;
      const draft = await EmailGenerationService.getDraft(userId, id);
      res.json({ success: true, data: draft });
    } catch (err: unknown) {
      res.status(404).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * GET /api/email-generation/drafts/lead/:leadId
   */
  static async getDraftByLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const { leadId } = req.params;
      const draft = await EmailGenerationService.getDraftByLead(userId, leadId);
      res.json({ success: true, data: draft });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  /**
   * GET /api/email-generation/drafts
   */
  static async listDrafts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED: User session invalid' });
        return;
      }

      const drafts = await EmailGenerationService.listDrafts(userId);
      res.json({ success: true, data: drafts });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
}
