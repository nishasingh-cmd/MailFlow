import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { WhatsappGeneratorService } from './whatsapp-generator.service';
import { WhatsappService } from './whatsapp.service';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../../utils/crypto';
import { env } from '../../config/env';

const prisma = new PrismaClient();

export class WhatsappController {
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
   * POST /api/whatsapp/preview-template — Generate AI personalized template variables and resolved preview text
   */
  static async previewTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId, templateName, templateBodyText } = req.body as {
        leadId?: string;
        templateName?: string;
        templateBodyText?: string;
      };
      const userId = req.user!.userId;

      const generated = await WhatsappGeneratorService.generateTemplateVariables(
        userId,
        leadId || '',
        templateName,
        templateBodyText
      );

      res.status(200).json({ success: true, data: generated });
    } catch (error: unknown) {
      const err = error as { message?: string };
      res.status(400).json({ error: err.message || 'Failed to generate template preview' });
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
      const { leadIds, campaignId, message, sendAll, templateName, templateParams } = req.body as {
        leadIds?: string[];
        campaignId?: string;
        message?: string;
        sendAll?: boolean;
        templateName?: string;
        templateParams?: string[];
      };

      const result = await WhatsappService.enqueueMessages(userId, {
        leadIds,
        campaignId,
        message,
        sendAll,
        templateName,
        templateParams,
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

  /**
   * GET /api/whatsapp/templates — Fetch all templates from Meta WABA API.
   * Returns exact template names, language codes, and status.
   * Use this to debug #130001 "Template name does not exist in the translation" errors.
   */
  static async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const config = await prisma.whatsappConfig.findUnique({ where: { userId } });

      if (!config?.accessToken || !config?.businessAccountId) {
        res.status(400).json({
          success: false,
          error:
            'WhatsApp not connected or WABA ID not configured. Please connect via Settings -> WhatsApp.',
        });
        return;
      }

      let token = '';
      try {
        token = decrypt(config.accessToken);
      } catch {
        token = config.accessToken;
      }

      const graphVersion = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
      const wabaId = config.businessAccountId;

      const url = `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates?fields=name,language,status,components&limit=100`;

      console.log(`[WhatsappController.getTemplates] Fetching templates for WABA: ${wabaId}`);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await response.json()) as {
        data?: Array<{
          name: string;
          language: string;
          status: string;
          components?: Array<{ type: string; text?: string; format?: string }>;
        }>;
        error?: { message?: string; code?: number };
      };

      console.log(`[WhatsappController.getTemplates] Meta response:`, JSON.stringify(data));

      if (!response.ok || data.error) {
        const errCode = data.error?.code;
        let errMsg = data.error?.message || `HTTP ${response.status}`;
        if (errCode === 190) errMsg = 'Access token expired or invalid.';
        if (errCode === 100)
          errMsg = `Invalid WABA ID "${wabaId}". Verify in Meta Business Manager.`;
        res.status(400).json({ success: false, error: errMsg });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          wabaId,
          templates: (data.data || []).map((t) => ({
            name: t.name,
            language: t.language,
            status: t.status,
            bodyText: t.components?.find((c) => c.type === 'BODY')?.text || null,
            headerText: t.components?.find((c) => c.type === 'HEADER')?.text || null,
            footerText: t.components?.find((c) => c.type === 'FOOTER')?.text || null,
            buttons:
              (t.components?.find((c) => c.type === 'BUTTONS') as { buttons?: unknown[] })
                ?.buttons || [],
          })),
        },
      });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] getTemplates error:', error);
      res.status(500).json({ error: 'Failed to fetch WhatsApp templates from Meta' });
    }
  }

  /**
   * POST /api/whatsapp/templates — Create or submit a new template to Meta WABA API.
   */
  static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        name,
        language = 'en_US',
        category = 'MARKETING',
        headerType = 'NONE',
        headerText,
        bodyText,
        sampleValues = [],
        footerText,
        buttons = [],
      } = req.body;

      if (!name || !bodyText) {
        res
          .status(400)
          .json({ success: false, error: 'Template name and body text are required.' });
        return;
      }

      const sanitizedName = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_');
      const config = await prisma.whatsappConfig.findUnique({ where: { userId } });

      // Build Meta components payload
      const components: Array<Record<string, unknown>> = [];

      if (headerType === 'TEXT' && headerText?.trim()) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: headerText.trim(),
        });
      }

      const bodyComponent: Record<string, unknown> = {
        type: 'BODY',
        text: bodyText.trim(),
      };
      if (Array.isArray(sampleValues) && sampleValues.length > 0 && sampleValues.some(Boolean)) {
        bodyComponent.example = {
          body_text: [sampleValues],
        };
      }
      components.push(bodyComponent);

      if (footerText?.trim()) {
        components.push({
          type: 'FOOTER',
          text: footerText.trim(),
        });
      }

      if (Array.isArray(buttons) && buttons.length > 0) {
        const formattedButtons = buttons.map(
          (btn: {
            type?: string;
            text?: string;
            url?: string;
            phoneNumber?: string;
            phone_number?: string;
          }) => {
            if (btn.type === 'QUICK_REPLY') {
              return {
                type: 'QUICK_REPLY',
                text: btn.text || 'Reply',
              };
            } else if (btn.type === 'URL') {
              return {
                type: 'URL',
                text: btn.text || 'Visit Website',
                url: btn.url || 'https://example.com',
              };
            } else if (btn.type === 'PHONE_NUMBER') {
              return {
                type: 'PHONE_NUMBER',
                text: btn.text || 'Call Phone',
                phone_number: btn.phoneNumber || btn.phone_number || '+1234567890',
              };
            }
            return btn;
          }
        );

        components.push({
          type: 'BUTTONS',
          buttons: formattedButtons,
        });
      }

      // If live credentials exist, dispatch to Meta Cloud API
      if (config?.accessToken && config?.businessAccountId) {
        let token = '';
        try {
          token = decrypt(config.accessToken);
        } catch {
          token = config.accessToken;
        }

        const graphVersion = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
        const wabaId = config.businessAccountId;
        const url = `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates`;

        const metaPayload = {
          name: sanitizedName,
          category,
          language,
          components,
        };

        console.log(
          '[WhatsappController.createTemplate] Dispatching to Meta:',
          JSON.stringify(metaPayload)
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        });

        const data = (await response.json()) as {
          id?: string;
          status?: string;
          error?: { message?: string; code?: number };
        };

        console.log('[WhatsappController.createTemplate] Meta API Response:', JSON.stringify(data));

        if (!response.ok || data.error) {
          const errMsg = data.error?.message || `Meta API Error (${response.status})`;
          res.status(400).json({ success: false, error: errMsg });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            id: data.id,
            name: sanitizedName,
            status: data.status || 'PENDING',
            category,
            language,
          },
          message: 'Template submitted successfully to Meta for approval.',
        });
        return;
      }

      // If no live Meta connection, return success in local/demo mode
      res.status(200).json({
        success: true,
        data: {
          id: `tmpl_${Date.now()}`,
          name: sanitizedName,
          status: 'PENDING',
          category,
          language,
          isMock: true,
        },
        message: 'Template created and queued for review.',
      });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] createTemplate error:', error);
      res.status(500).json({ success: false, error: 'Failed to create WhatsApp template' });
    }
  }

  /**
   * DELETE /api/whatsapp/templates/:name — Delete a template from Meta WABA or local.
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ success: false, error: 'Template name is required.' });
        return;
      }

      const config = await prisma.whatsappConfig.findUnique({ where: { userId } });

      if (config?.accessToken && config?.businessAccountId) {
        let token = '';
        try {
          token = decrypt(config.accessToken);
        } catch {
          token = config.accessToken;
        }

        const graphVersion = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
        const wabaId = config.businessAccountId;
        const url = `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates?name=${encodeURIComponent(
          name
        )}`;

        console.log(
          `[WhatsappController.deleteTemplate] Deleting template "${name}" from Meta WABA: ${wabaId}`
        );

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = (await response.json()) as {
          success?: boolean;
          error?: { message?: string; code?: number };
        };

        console.log('[WhatsappController.deleteTemplate] Meta API Response:', JSON.stringify(data));

        if (!response.ok || data.error) {
          const errMsg =
            data.error?.message || `Failed to delete template from Meta (${response.status})`;
          res.status(400).json({ success: false, error: errMsg });
          return;
        }

        res.status(200).json({
          success: true,
          message: `Template "${name}" deleted successfully from Meta.`,
        });
        return;
      }

      // If no live Meta connection, return success in local mode
      res.status(200).json({
        success: true,
        message: `Template "${name}" deleted successfully.`,
      });
    } catch (error: unknown) {
      console.error('[whatsapp.controller] deleteTemplate error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete WhatsApp template' });
    }
  }
}
