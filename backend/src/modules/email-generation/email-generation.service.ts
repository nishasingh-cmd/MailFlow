/**
 * MailFlow — Email Generation Service Module
 * Phase 7: AI Email Generation
 *
 * Orchestrates email generation, subject line creation, validation,
 * and draft CRUD persistence in PostgreSQL via Prisma.
 * Strictly grounds email generation in lead-specific company research.
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
   * Validate lead & company research strictly, then generate AI Email & Subject Lines.
   */
  static async generateEmailForLead(
    userId: string,
    req: GenerateEmailRequest
  ): Promise<GeneratedEmailResult> {
    const { leadId, template = 'Cold Outreach', customInstructions, userContext } = req;

    // 1. Fetch Lead with company and direct lead research record (strict tenant isolation)
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

    // 2. Strict Lead-to-Research contract validation
    if (!research) {
      throw new Error(
        'RESEARCH_MISSING: Company research is required before generating a personalized email. Please complete research first.'
      );
    }

    if (research.status === 'PENDING' || research.status === 'PROCESSING') {
      throw new Error(
        'RESEARCH_IN_PROGRESS: Research is still in progress. Please wait until completed.'
      );
    }

    if (research.status === 'FAILED') {
      throw new Error('RESEARCH_FAILED: Research failed for this company. Please retry research.');
    }

    if (research.status !== 'COMPLETED') {
      throw new Error(
        'RESEARCH_NOT_COMPLETED: Company research must be completed before generating a personalized email.'
      );
    }

    // Verify research.leadId === lead.id
    if (research.leadId !== lead.id) {
      console.error(
        `[EmailGeneration] RESEARCH_MISMATCH! lead.id (${lead.id}) !== research.leadId (${research.leadId})`
      );
      throw new Error(
        'RESEARCH_MISMATCH: Lead research mismatch. Please refresh the research before generating the email.'
      );
    }

    // Verify company name context
    const leadCompany = (lead.company || '').trim().toLowerCase();
    const researchCompany = (research.companyNameAtResearchTime || '').trim().toLowerCase();
    if (leadCompany && researchCompany && leadCompany !== researchCompany) {
      console.warn(
        `[EmailGeneration] Potential company name divergence: lead.company="${leadCompany}" vs research.company="${researchCompany}"`
      );
    }

    // 3. Resolve AI Key from user's Settings integration if available
    let userApiKey: string | null = null;
    let userProvider: 'OPENAI' | 'GEMINI' | null = null;
    try {
      const aiConfig = await prisma.aiConfig.findUnique({ where: { userId } });
      if (aiConfig?.apiKey) {
        const { decrypt } = await import('../../utils/crypto');
        userApiKey = decrypt(aiConfig.apiKey);
        userProvider = aiConfig.provider as 'OPENAI' | 'GEMINI';
      }
    } catch {
      // Fall back to environment keys
    }

    // Fetch user for sender info + business profile context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { businessProfile: true },
    });

    const bp = user?.businessProfile;

    const companyName =
      lead.company || research.companyNameAtResearchTime || company?.name || 'Company';

    const products = (research.productsServices as string[]) || company?.products || [];
    const painPoints = (research.painPoints as string[]) || [];
    const opportunities = (research.opportunities as string[]) || [];
    const verifiedIndustry = research.industry || company?.industry || lead.industry || null;

    // Debug logging for auditing grounding integrity
    console.log(`[EmailGeneration] Grounded generation starting:`, {
      leadId: lead.id,
      leadName: lead.name,
      companyName,
      researchId: research.id,
      researchCompanyName: research.companyNameAtResearchTime,
      researchIndustry: verifiedIndustry,
      researchStatus: research.status,
      researchVersion: research.researchVersion,
    });

    const promptCtx: PromptContext = {
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      companyName,
      jobTitle: null,
      companySummary: research.summary || research.companyDescription || '',
      industry: verifiedIndustry,
      products,
      services: company?.services || [],
      painPoints,
      opportunities,
      targetAudience: research.targetAudience || null,
      companySize: research.companySize || company?.companySize || null,
      location: research.location || null,
      personalizationInsights: (research.personalizationInsights as string) || null,
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
      userApiKey,
      userProvider,
      userContext: {
        userName: userContext?.userName || user?.name || 'Nisha Singh',
        userCompany: userContext?.userCompany || bp?.businessName || 'MailFlow',
        userProductService:
          userContext?.userProductService ||
          bp?.productsOrServices ||
          bp?.valueProposition ||
          'Lead Outreach Automation Platform',
      },
    };

    return EmailGeneratorService.generateEmail(promptCtx);
  }

  /**
   * Generate 5 subject line suggestions for a lead grounded in company research.
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
        `Outreach workflow for ${lead?.company || 'your team'}`,
        `Streamlining outreach at ${lead?.company || 'your team'}`,
        `Connecting with ${lead?.company || 'your team'}`,
        `Outreach ideas for ${lead?.company || 'your team'}`,
      ];
    }

    let userApiKey: string | null = null;
    let userProvider: 'OPENAI' | 'GEMINI' | null = null;
    try {
      const aiConfig = await prisma.aiConfig.findUnique({ where: { userId } });
      if (aiConfig?.apiKey) {
        const { decrypt } = await import('../../utils/crypto');
        userApiKey = decrypt(aiConfig.apiKey);
        userProvider = aiConfig.provider as 'OPENAI' | 'GEMINI';
      }
    } catch {
      // Fall back
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const promptCtx: PromptContext = {
      leadId: lead.id,
      leadName: lead.name,
      companyName:
        lead.company || research.companyNameAtResearchTime || lead.companyRef?.name || 'Company',
      industry: research.industry || lead.companyRef?.industry || lead.industry || null,
      template,
      userApiKey,
      userProvider,
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
