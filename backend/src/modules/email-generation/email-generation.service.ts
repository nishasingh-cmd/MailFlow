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

    // 1. Fetch Lead with company and direct lead research record
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        research: true,
        companyRef: true,
      },
    });

    if (!lead) {
      throw new Error('LEAD_NOT_FOUND: Lead does not exist or access denied');
    }

    const company = lead.companyRef;
    const research = lead.research;

    // Requirement 13: Prevent generation if company research has not been completed
    if (!research || research.status !== 'COMPLETED') {
      throw new Error(
        'RESEARCH_NOT_COMPLETED: Company research must be completed before generating a personalized email'
      );
    }

    // Fetch user for default sender info + business profile context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { businessProfile: true },
    });

    const bp = user?.businessProfile;

    const companyName =
      lead.company || research.companyNameAtResearchTime || company?.name || 'your company';

    const products = (research.productsServices as string[]) || company?.products || [];
    const painPoints = (research.painPoints as string[]) || [];
    const opportunities = (research.opportunities as string[]) || [];

    const promptCtx: PromptContext = {
      leadName: lead.name,
      leadEmail: lead.email,
      companyName,
      companySummary: research.summary || research.companyDescription || '',
      industry: research.industry || company?.industry || lead.industry || 'Business',
      products,
      services: company?.services || [],
      painPoints,
      opportunities,
      companySize: research.companySize || company?.companySize,
      template,
      customInstructions: [
        customInstructions,
        bp
          ? `Sender Company: ${bp.businessName}. Sender Value Proposition: ${bp.valueProposition}. Target Audience: ${bp.targetAudience}. Tone: ${bp.toneOfVoice}.`
          : '',
      ]
        .filter(Boolean)
        .join(' | '),
      regenerate: req.regenerate,
      regenSeed: req.regenSeed || Date.now(),
      userContext: {
        userName: userContext?.userName || user?.name || 'Sales Specialist',
        userCompany: userContext?.userCompany || bp?.businessName || 'MailFlow',
        userProductService:
          userContext?.userProductService ||
          bp?.productsOrServices ||
          bp?.valueProposition ||
          'AI Outreach Automation Platform',
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
        research: true,
        companyRef: true,
      },
    });

    const research = lead?.research;
    if (!lead || !research || research.status !== 'COMPLETED') {
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
      companyName:
        lead.company || research.companyNameAtResearchTime || lead.companyRef?.name || 'Company',
      industry: research.industry || lead.companyRef?.industry || lead.industry || 'Business',
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
