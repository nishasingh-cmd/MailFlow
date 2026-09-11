import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { BusinessProfileService } from './business-profile.service';

export class BusinessProfileController {
  /**
   * GET /api/business-profile — Fetch current user's business profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await BusinessProfileService.getProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res
        .status(500)
        .json({ success: false, error: err.message || 'Failed to fetch business profile' });
    }
  }

  /**
   * POST /api/business-profile — Create or complete initial business profile
   */
  static async createProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const body = req.body;

      // Validation: Only core business basics and description are required
      const errors: Record<string, string> = {};

      if (!body.businessName?.trim()) {
        errors.businessName = 'Business name is required.';
      }
      if (!body.industry?.trim()) {
        errors.industry = 'Industry is required.';
      }
      if (!body.businessDescription?.trim()) {
        errors.businessDescription = 'Business description is required.';
      }

      if (body.website?.trim()) {
        const urlStr = body.website.trim();
        // Allow domain or full url
        const hasProtocol = /^https?:\/\//i.test(urlStr);
        const toTest = hasProtocol ? urlStr : `https://${urlStr}`;
        try {
          new URL(toTest);
        } catch {
          errors.website = 'Please provide a valid website URL.';
        }
      }

      if (Object.keys(errors).length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      const profile = await BusinessProfileService.createProfile(userId, {
        businessName: body.businessName,
        website: body.website,
        industry: body.industry,
        location: body.location,
        companySize: body.companySize,
        businessDescription: body.businessDescription,
        productsOrServices: body.productsOrServices,
        valueProposition: body.valueProposition,
        targetAudience: body.targetAudience,
        idealCustomerProfile: body.idealCustomerProfile,
        outreachGoal: Array.isArray(body.outreachGoal) ? body.outreachGoal : [],
        toneOfVoice: body.toneOfVoice || 'Professional',
      });

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Your business profile is ready.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res
        .status(500)
        .json({ success: false, error: err.message || 'Failed to save business profile' });
    }
  }

  /**
   * PATCH /api/business-profile — Update existing business profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const body = req.body;

      if (body.website?.trim()) {
        const urlStr = body.website.trim();
        const hasProtocol = /^https?:\/\//i.test(urlStr);
        const toTest = hasProtocol ? urlStr : `https://${urlStr}`;
        try {
          new URL(toTest);
        } catch {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { website: 'Please provide a valid website URL.' },
          });
          return;
        }
      }

      const profile = await BusinessProfileService.updateProfile(userId, body);

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Your business profile has been updated.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res
        .status(500)
        .json({ success: false, error: err.message || 'Failed to update business profile' });
    }
  }

  /**
   * GET /api/business-profile/context — AI context preview
   */
  static async getBusinessContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const context = await BusinessProfileService.getBusinessContext(userId);
      res.status(200).json({ success: true, data: { context } });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res
        .status(500)
        .json({ success: false, error: err.message || 'Failed to get business context' });
    }
  }
}
