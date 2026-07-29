import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { LeadsService } from './leads.service';
import {
  createLeadSchema,
  updateLeadSchema,
  bulkDeleteSchema,
  validateMappingSchema,
  importLeadsSchema,
  queryLeadsSchema,
} from './leads.validation';

export class LeadsController {
  /**
   * Preview uploaded file: extract headers, sample rows, auto column mapping
   */
  static async uploadPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded. Please upload a CSV or Excel file.' });
        return;
      }

      const preview = LeadsService.parsePreview(
        req.file.buffer,
        req.file.originalname,
        req.file.size
      );

      res.status(200).json(preview);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.startsWith('FILE_EMPTY') || err.message?.startsWith('INVALID_FORMAT')) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error('[leads.controller] Upload preview error:', error);
      res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  }

  /**
   * Validate column mapping & detect duplicates before final import
   */
  static async validateMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Missing file for mapping validation' });
        return;
      }

      const mappingObj =
        typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      const validated = validateMappingSchema.parse({ mapping: mappingObj });

      const userId = req.user!.userId;
      const result = await LeadsService.validateMappingAndDuplicates(
        userId,
        req.file.buffer,
        validated.mapping
      );

      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid mapping payload' });
        return;
      }
      console.error('[leads.controller] Validate mapping error:', error);
      res.status(500).json({ error: 'Failed to validate lead mapping' });
    }
  }

  /**
   * Save validated leads & create import record
   */
  static async importLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = importLeadsSchema.parse(req.body);
      const userId = req.user!.userId;
      const result = await LeadsService.executeImport(userId, validated);

      res.status(201).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid import payload' });
        return;
      }
      console.error('[leads.controller] Import leads error:', error);
      res.status(500).json({ error: 'Failed to import leads' });
    }
  }

  /**
   * Get paginated leads list
   */
  static async getLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedQuery = queryLeadsSchema.parse(req.query);
      const userId = req.user!.userId;

      const result = await LeadsService.getLeads(userId, validatedQuery);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid search query' });
        return;
      }
      console.error('[leads.controller] Get leads error:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  }

  /**
   * Get single lead by ID
   */
  static async getLeadById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const lead = await LeadsService.getLeadById(userId, id);
      res.status(200).json(lead);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      console.error('[leads.controller] Get lead by id error:', error);
      res.status(500).json({ error: 'Failed to fetch lead details' });
    }
  }

  /**
   * Create single lead
   */
  static async createLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = createLeadSchema.parse(req.body);
      const userId = req.user!.userId;

      const lead = await LeadsService.createLead(userId, validated);
      res.status(201).json(lead);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid lead details' });
        return;
      }
      if (err.message === 'DUPLICATE_LEAD_EMAIL') {
        res.status(409).json({ error: 'A lead with this email address already exists.' });
        return;
      }
      console.error('[leads.controller] Create lead error:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  /**
   * Update lead
   */
  static async updateLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateLeadSchema.parse(req.body);
      const userId = req.user!.userId;

      const updated = await LeadsService.updateLead(userId, id, validated);
      res.status(200).json(updated);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid update data' });
        return;
      }
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      if (err.message === 'DUPLICATE_LEAD_EMAIL') {
        res.status(409).json({ error: 'A lead with this email address already exists.' });
        return;
      }
      console.error('[leads.controller] Update lead error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }

  /**
   * Delete single lead
   */
  static async deleteLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const result = await LeadsService.deleteLead(userId, id);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'LEAD_NOT_FOUND') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      console.error('[leads.controller] Delete lead error:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }

  /**
   * Bulk delete leads
   */
  static async bulkDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validated = bulkDeleteSchema.parse(req.body);
      const userId = req.user!.userId;

      const result = await LeadsService.bulkDeleteLeads(userId, validated.ids);
      res.status(200).json(result);
    } catch (error: unknown) {
      const err = error as { name?: string; errors?: { message?: string }[] };
      if (err.name === 'ZodError') {
        res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid bulk delete payload' });
        return;
      }
      console.error('[leads.controller] Bulk delete error:', error);
      res.status(500).json({ error: 'Failed to delete selected leads' });
    }
  }

  /**
   * Get user import history
   */
  static async getImportHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const history = await LeadsService.getImportHistory(userId);
      res.status(200).json(history);
    } catch (error: unknown) {
      console.error('[leads.controller] Get import history error:', error);
      res.status(500).json({ error: 'Failed to fetch import history' });
    }
  }
}
