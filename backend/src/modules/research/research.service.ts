/**
 * MailFlow — Research Service
 * Phase 6: AI Company Research
 *
 * Orchestrates company research with true per-lead isolation, settings-integrated AI keys,
 * verified live website scraping, and zero hallucinated fallback boilerplate.
 */
import { prisma } from '../../config/db';
import {
  researchCompanyWithAI,
  simplifyJargon,
  LeadResearchContext,
} from '../../services/gemini.service';
import {
  ResearchProgressResponse,
  LeadResearchResult,
  CompanyResearch,
  Company,
} from '@mailflow/shared';
import { Prisma } from '@prisma/client';

function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
  ) as T;
}

export class ResearchService {
  /**
   * Get or create a Company record for a given lead to ensure backward compatibility.
   */
  static async getOrCreateCompany(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) {
      throw new Error('LEAD_NOT_FOUND: Lead does not exist or access denied');
    }
    if (!lead.company || !lead.company.trim()) {
      throw new Error('INVALID_COMPANY_NAME: Lead has no company name to research');
    }

    const companyName = lead.company.trim();

    // Upsert company by (userId, name)
    const company = await prisma.company.upsert({
      where: { userId_name: { userId, name: companyName } },
      create: {
        userId,
        name: companyName,
        website: lead.website ?? null,
        industry: lead.industry ?? null,
        products: [],
        services: [],
        techStack: [],
      },
      update: {
        website: lead.website || undefined,
        industry: lead.industry || undefined,
      },
    });

    // Link lead → company if not already linked
    if (lead.companyId !== company.id) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { companyId: company.id },
      });
    }

    return { company, lead };
  }

  /**
   * Research a single lead's company with strict per-lead isolation, settings-integrated AI keys,
   * live web scraping, and evidence-based structured results.
   */
  static async researchCompany(
    userId: string,
    leadId: string,
    forceRefresh = false
  ): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
    research?: unknown;
  }> {
    const startTime = Date.now();
    console.log(`[RESEARCH] [STEP 1] Request received: Lead ID = ${leadId}, User ID = ${userId}`);

    // Step 1: Fetch exact Lead with tenant isolation
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { research: true, companyRef: true },
    });

    if (!lead) {
      console.error(`[RESEARCH] [STEP 1 FAILED] Lead not found: ${leadId}`);
      return {
        leadId,
        companyName: '',
        status: 'FAILED',
        error: 'Lead not found or access denied',
      };
    }

    if (!lead.company || !lead.company.trim()) {
      console.warn(`[RESEARCH] [STEP 1 FAILED] Lead has no company name: ${leadId}`);
      return {
        leadId,
        companyName: '',
        status: 'FAILED',
        error: 'Company name required for research.',
      };
    }

    const companyName = lead.company.trim();

    // Ensure company record exists for backward compatibility
    let companyObj = lead.companyRef;
    if (!companyObj) {
      try {
        const { company } = await ResearchService.getOrCreateCompany(userId, leadId);
        companyObj = company;
      } catch (compErr) {
        console.warn(`[RESEARCH] Auto-create company skipped: ${(compErr as Error).message}`);
      }
    }

    // Cache check — strictly per-lead cache check!
    const existingResearch =
      lead.research ||
      (await prisma.companyResearch.findUnique({
        where: { leadId },
      }));

    const isStaleBoilerplate =
      existingResearch?.summary?.includes('domain-focused business capabilities') ||
      existingResearch?.summary?.includes('friendly customer help') ||
      existingResearch?.summary?.includes('helps businesses run smoothly');

    if (!forceRefresh && !isStaleBoilerplate && existingResearch?.status === 'COMPLETED') {
      console.log(
        `[RESEARCH] [CACHE HIT] Lead-specific research already COMPLETED for Lead "${lead.name}" (${companyName}). Returning lead-isolated result.`
      );
      return {
        leadId,
        companyName,
        status: 'COMPLETED',
        research: serializeDates(existingResearch as unknown as Record<string, unknown>),
      };
    }

    // Step 2: Resolve AI Key from user's Settings integration if available
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
      // If decryption fails or not configured, falls back to env keys
    }

    // Step 3: Upsert research record tied strictly to THIS leadId → set status to PROCESSING
    const research = await prisma.companyResearch.upsert({
      where: { leadId },
      create: {
        leadId,
        userId,
        companyId: companyObj?.id ?? null,
        companyNameAtResearchTime: companyName,
        status: 'PROCESSING',
      },
      update: {
        userId,
        companyId: companyObj?.id ?? undefined,
        companyNameAtResearchTime: companyName,
        status: 'PROCESSING',
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    try {
      // Step 4: Execute evidence-based AI / Website research pipeline
      const researchContext: LeadResearchContext = {
        leadId,
        leadName: lead.name,
        leadEmail: lead.email,
        companyName,
        website: lead.website || companyObj?.website,
        industry: lead.industry || companyObj?.industry,
        jobTitle:
          lead.customFields && typeof lead.customFields === 'object'
            ? ((lead.customFields as Record<string, unknown>).jobTitle as string) || null
            : null,
        userApiKey,
        userProvider,
      };

      const { intelligence, rawResponse } = await researchCompanyWithAI(researchContext);

      const durationMs = Date.now() - startTime;
      console.log(
        `[RESEARCH] [STEP 4] Intelligence gathered: Provider = "${intelligence.providerUsed}", Duration = ${durationMs}ms`
      );

      // Step 5: Save Research Data directly into lead-specific CompanyResearch record
      const updatedResearch = await prisma.companyResearch.update({
        where: { id: research.id },
        data: {
          status: 'COMPLETED',
          summary: intelligence.summary,
          companyDescription: intelligence.description,
          industry: intelligence.industry,
          productsServices: intelligence.products,
          targetAudience: intelligence.targetCustomers,
          companySize: intelligence.companySize,
          location: intelligence.headquarters,
          painPoints: intelligence.painPoints,
          recentNews: intelligence.recentNews || [],
          relevantInsights: [
            ...(intelligence.keyBusinessFocus ? [intelligence.keyBusinessFocus] : []),
            ...(intelligence.relevantInsights || []),
          ],
          personalizationInsights: intelligence.personalizationInsights
            ? (intelligence.personalizationInsights as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          sources: intelligence.sources as unknown as Prisma.InputJsonValue,
          confidence: intelligence.confidence,
          companyWebsite: intelligence.detectedWebsite,
          companyDomain: intelligence.detectedWebsite,
          rawAiResponse: rawResponse,
          researchedAt: new Date(),
          lastResearched: new Date(),
          errorMessage: null,
        },
      });

      // Update Company entity with verified details for consistency across UI
      if (companyObj?.id) {
        await prisma.company.update({
          where: { id: companyObj.id },
          data: {
            industry: intelligence.industry,
            description: intelligence.description,
            products: intelligence.products,
            services: intelligence.services,
            headquarters: intelligence.headquarters,
            companySize: intelligence.companySize,
            targetCustomers: intelligence.targetCustomers,
            techStack: intelligence.techStack,
            website: intelligence.detectedWebsite || companyObj.website,
          },
        });
      }

      console.log(
        `[RESEARCH] [STEP 5] Saved per-lead research: Lead ID = ${leadId}, Research ID = ${updatedResearch.id}, Status = COMPLETED`
      );

      return {
        leadId,
        companyName,
        status: 'COMPLETED',
        research: serializeDates(updatedResearch as unknown as Record<string, unknown>),
      };
    } catch (err: unknown) {
      const rawError = (err as Error).message ?? 'Unknown research error';
      console.error(`[RESEARCH] [FAILED] Research error for "${companyName}": ${rawError}`);

      let categorizedError = rawError;
      const targetStatus = 'FAILED' as const;

      if (rawError.includes('IDENTITY_UNVERIFIED')) {
        categorizedError =
          'Identity unverified: Could not verify official website or online identity for this company. Please provide the company website URL or configure an AI API key in Settings.';
      } else if (rawError.includes('MISSING_KEY')) {
        categorizedError =
          'Missing API key: Configure your Gemini or OpenAI API key in Settings → AI Integration.';
      } else if (rawError.includes('TIMEOUT')) {
        categorizedError = 'Network timeout: Research request timed out after 25 seconds.';
      } else if (rawError.includes('RATE_LIMIT')) {
        categorizedError = 'Rate limit exceeded: AI provider rate limit or quota reached.';
      }

      await prisma.companyResearch.update({
        where: { id: research.id },
        data: {
          status: targetStatus,
          errorMessage: categorizedError,
        },
      });

      console.log(`[RESEARCH] [STEP 6] Response returned: Lead ID = ${leadId}, Status = FAILED`);
      return { leadId, companyName, status: targetStatus, error: categorizedError };
    }
  }

  /**
   * Bulk research — runs sequentially across selected leads with progress tracking.
   */
  static async bulkResearch(userId: string, leadIds: string[]): Promise<ResearchProgressResponse> {
    console.log(
      `[BULK RESEARCH] Starting bulk research for ${leadIds.length} leads (User: ${userId})`
    );
    const results: ResearchProgressResponse['results'] = [];
    let completed = 0;
    let failed = 0;
    let pending = leadIds.length;

    for (const leadId of leadIds) {
      pending -= 1;
      const result = await ResearchService.researchCompany(userId, leadId);
      results.push(result as ResearchProgressResponse['results'][number]);
      if (result.status === 'COMPLETED') completed += 1;
      else if (result.status === 'FAILED') failed += 1;
    }

    console.log(
      `[BULK RESEARCH] Completed batch: Total = ${leadIds.length}, Completed = ${completed}, Failed = ${failed}`
    );
    return {
      total: leadIds.length,
      completed,
      failed,
      pending,
      results,
    };
  }

  /**
   * Research ALL leads belonging to the user that have a company name.
   */
  static async researchAll(userId: string): Promise<ResearchProgressResponse> {
    const leads = await prisma.lead.findMany({
      where: { userId, company: { not: null } },
      select: { id: true },
    });

    const leadIds = leads.map((l) => l.id);
    if (leadIds.length === 0) {
      return { total: 0, completed: 0, failed: 0, pending: 0, results: [] };
    }

    return ResearchService.bulkResearch(userId, leadIds);
  }

  /**
   * Retry a failed research for a lead.
   */
  static async retryResearch(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) throw new Error('LEAD_NOT_FOUND: Lead not found');

    await prisma.companyResearch.updateMany({
      where: { leadId },
      data: { status: 'PENDING', errorMessage: null },
    });

    return ResearchService.researchCompany(userId, leadId, true);
  }

  /**
   * Get research result scoped strictly to a specific lead.
   */
  static async getResearchByLead(
    userId: string,
    leadId: string
  ): Promise<LeadResearchResult | null> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        research: true,
        companyRef: true,
      },
    });

    if (!lead) throw new Error('LEAD_NOT_FOUND: Lead not found');

    // Strictly prioritize lead's direct isolated research
    let researchRecord = lead.research;

    // Detect if cached research is outdated generic boilerplate
    const isStaleBoilerplate =
      researchRecord?.summary?.includes('domain-focused business capabilities') ||
      researchRecord?.summary?.includes('friendly customer help') ||
      researchRecord?.summary?.includes('helps businesses run smoothly');

    if (isStaleBoilerplate && lead.company) {
      console.log(
        `[RESEARCH] Auto-updating stale generic boilerplate research for Lead "${lead.name}" (${lead.company})...`
      );
      try {
        const refreshResult = await ResearchService.researchCompany(userId, leadId, true);
        if (refreshResult.status === 'COMPLETED') {
          const refreshedLead = await prisma.lead.findFirst({
            where: { id: leadId, userId },
            include: { research: true, companyRef: true },
          });
          if (refreshedLead?.research) {
            researchRecord = refreshedLead.research;
          }
        }
      } catch (err) {
        console.warn(`[RESEARCH] Auto-update failed: ${(err as Error).message}`);
      }
    }

    const companySerialized = lead.companyRef
      ? (serializeDates(
          lead.companyRef as unknown as Record<string, unknown>
        ) as unknown as Company)
      : null;

    const researchSerialized = researchRecord
      ? (serializeDates(
          researchRecord as unknown as Record<string, unknown>
        ) as unknown as CompanyResearch)
      : null;

    if (researchSerialized) {
      if (typeof researchSerialized.summary === 'string') {
        researchSerialized.summary = simplifyJargon(researchSerialized.summary);
      }
      if (Array.isArray(researchSerialized.painPoints)) {
        researchSerialized.painPoints = researchSerialized.painPoints.map((p) =>
          typeof p === 'string' ? simplifyJargon(p) : p
        );
      }
      if (Array.isArray(researchSerialized.opportunities)) {
        researchSerialized.opportunities = researchSerialized.opportunities.map((o) =>
          typeof o === 'string' ? simplifyJargon(o) : o
        );
      }
    }

    const companyName =
      lead.company ||
      researchSerialized?.companyNameAtResearchTime ||
      lead.companyRef?.name ||
      'Unknown Company';
    const status = researchSerialized?.status ?? (lead.company ? 'PENDING' : 'FAILED');

    return {
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      companyName,
      website:
        lead.website || researchSerialized?.companyWebsite || lead.companyRef?.website || null,
      industry: researchSerialized?.industry || lead.companyRef?.industry || null,
      status,
      research: researchSerialized,
      company: companySerialized
        ? {
            ...companySerialized,
            research: researchSerialized,
          }
        : null,
      sources: (researchSerialized?.sources as unknown as LeadResearchResult['sources']) || [],
      confidence:
        (researchSerialized?.confidence as unknown as LeadResearchResult['confidence']) || 'MEDIUM',
      researchedAt: researchSerialized?.researchedAt || researchSerialized?.lastResearched || null,
      error: researchSerialized?.errorMessage || null,
    };
  }

  /**
   * Get research status for multiple leads in one call for table display.
   */
  static async getBulkResearchStatus(userId: string, leadIds: string[]) {
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, userId },
      select: {
        id: true,
        company: true,
        companyId: true,
        research: {
          select: { status: true, lastResearched: true, researchedAt: true },
        },
      },
    });

    return leads.map((l) => ({
      leadId: l.id,
      companyId: l.companyId,
      companyName: l.company,
      researchStatus: l.research?.status || null,
      lastResearched:
        (l.research?.researchedAt || l.research?.lastResearched)?.toISOString() ?? null,
    }));
  }
}
