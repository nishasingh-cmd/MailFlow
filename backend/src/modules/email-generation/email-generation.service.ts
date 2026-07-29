/**
 * MailFlow — Email Generation Service Module
 * Phase 7: AI Email Generation
 *
 * Orchestrates email generation, subject line creation, validation,
 * and draft CRUD persistence in PostgreSQL via Prisma.
 */
import { prisma } from '../../config/db';
import {
  EmailTemplateType,
  GenerateEmailRequest,
  GeneratedEmailResult,
  SaveDraftRequest,
  UpdateDraftRequest,
  DraftStatus,
} from '@mailflow/shared';
import { EmailGeneratorService } from '../../services/email-generator.service';
import { PromptContext } from '../../services/email-prompt.service';

export class EmailGenerationService {
  /**
   * Validate lead & company research, then generate AI Email & Subject Lines.
   */
  static async generateEmailForLead(
    userId: string,
    req: GenerateEmailRequest
  ): Promise<GeneratedEmailResult> {
    const { leadId, template = 'Cold Outreach', customInstructions, userContext } = req;

    // 1. Fetch Lead with company and research records
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        companyRef: {
          include: {
            research: true,
          },
        },
      },
    });

    if (!lead) {
      throw new Error('LEAD_NOT_FOUND: Lead does not exist or access denied');
    }

    const company = lead.companyRef;
    const research = company?.research;

    // Requirement 13: Prevent generation if company research has not been completed
    if (!research || research.status !== 'COMPLETED') {
      throw new Error(
        'RESEARCH_NOT_COMPLETED: Company research must be completed before generating a personalized email'
      );
    }

    // Fetch user for default sender info
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const promptCtx: PromptContext = {
      leadName: lead.name,
      leadEmail: lead.email,
      companyName: company.name,
      companySummary: research.summary,
      industry: company.industry || lead.industry,
      products: company.products,
      services: company.services,
      painPoints: (research.painPoints as string[]) || [],
      opportunities: (research.opportunities as string[]) || [],
      companySize: company.companySize,
      template,
      customInstructions,
      regenerate: req.regenerate,
      regenSeed: req.regenSeed || Date.now(),
      userContext: {
        userName: userContext?.userName || user?.name || 'Sales Specialist',
        userCompany: userContext?.userCompany || 'MailFlow',
        userProductService: userContext?.userProductService || 'AI Outreach Automation Platform',
      },
    };

    return EmailGeneratorService.generateEmail(promptCtx);
  }

  /**
   * Generate 5 subject line suggestions for a lead.
   */
  static async generateSubjectLinesForLead(
    userId: string,
    leadId: string,
    template: EmailTemplateType = 'Cold Outreach'
  ): Promise<string[]> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        companyRef: {
          include: {
            research: true,
          },
        },
      },
    });

    if (!lead || !lead.companyRef?.research || lead.companyRef.research.status !== 'COMPLETED') {
      return [
        `Quick idea for ${lead?.company || 'your team'}`,
        `Helping ${lead?.company || 'your team'} automate outreach`,
        `Reducing manual sales work at ${lead?.company || 'your team'}`,
        `AI workflow for ${lead?.company || 'your team'}`,
        `Outreach ideas for ${lead?.company || 'your team'}`,
      ];
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const promptCtx: PromptContext = {
      leadName: lead.name,
      companyName: lead.companyRef.name,
      industry: lead.companyRef.industry || lead.industry,
      template,
      userContext: {
        userName: user?.name,
      },
    };

    return EmailGeneratorService.generateSubjectLines(promptCtx);
  }

  /**
   * Save or upsert email draft.
   */
  static async saveDraft(userId: string, req: SaveDraftRequest) {
    const { leadId, researchId, subject, body, template, status = 'SAVED' } = req;

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) {
      throw new Error('LEAD_NOT_FOUND: Lead does not exist or access denied');
    }

    // Upsert draft by (userId, leadId) or create new draft
    const existing = await prisma.emailDraft.findFirst({
      where: { userId, leadId },
    });

    if (existing) {
      return prisma.emailDraft.update({
        where: { id: existing.id },
        data: {
          subject,
          body,
          template,
          status: status as DraftStatus,
          researchId: researchId || existing.researchId,
        },
      });
    }

    return prisma.emailDraft.create({
      data: {
        userId,
        leadId,
        researchId: researchId ?? null,
        subject,
        body,
        template,
        status: status as DraftStatus,
      },
    });
  }

  /**
   * Update existing draft by draft ID.
   */
  static async updateDraft(userId: string, draftId: string, req: UpdateDraftRequest) {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: draftId, userId },
    });

    if (!draft) {
      throw new Error('DRAFT_NOT_FOUND: Draft does not exist or access denied');
    }

    return prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        subject: req.subject ?? draft.subject,
        body: req.body ?? draft.body,
        template: req.template ?? draft.template,
        status: (req.status as DraftStatus) ?? draft.status,
      },
    });
  }

  /**
   * Get draft by ID.
   */
  static async getDraft(userId: string, draftId: string) {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: draftId, userId },
      include: {
        lead: true,
      },
    });

    if (!draft) {
      throw new Error('DRAFT_NOT_FOUND: Draft does not exist or access denied');
    }

    return draft;
  }

  /**
   * Get draft by lead ID (if exists).
   */
  static async getDraftByLead(userId: string, leadId: string) {
    return prisma.emailDraft.findFirst({
      where: { userId, leadId },
      include: {
        lead: true,
      },
    });
  }

  /**
   * List all drafts for user.
   */
  static async listDrafts(userId: string) {
    return prisma.emailDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: true,
      },
    });
  }
}
