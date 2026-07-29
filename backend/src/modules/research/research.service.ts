/**
 * MailFlow — Research Service
 * Phase 6: AI Company Research
 *
 * Orchestrates company research: validation, website detection, AI intelligence gathering,
 * caching, status tracking, and step-by-step logging.
 */
import { prisma } from '../../config/db';
import { researchCompanyWithAI } from '../../services/gemini.service';
import { ResearchProgressResponse } from '@mailflow/shared';

function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
  ) as T;
}

export class ResearchService {
  /**
   * Get or create a Company record for a given lead.
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
        website: { set: lead.website ?? undefined },
        industry: { set: lead.industry ?? undefined },
      },
      include: { research: true },
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
   * Research a single lead's company with 6-step detailed logging and error recovery.
   */
  static async researchCompany(
    userId: string,
    leadId: string
  ): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
    company?: unknown;
  }> {
    const startTime = Date.now();
    console.log(`[RESEARCH] [STEP 1] Request received: Lead ID = ${leadId}, User ID = ${userId}`);

    // Step 1 & 2: Fetch Lead & Company
    let companyObj;
    let leadObj;
    try {
      const { company, lead } = await ResearchService.getOrCreateCompany(userId, leadId);
      companyObj = company;
      leadObj = lead;
      console.log(
        `[RESEARCH] [STEP 2] Company detected: Name = "${companyObj.name}", Website = "${companyObj.website ?? 'None'}"`
      );
    } catch (err) {
      const msg = (err as Error).message ?? 'Failed to detect company';
      console.error(`[RESEARCH] [STEP 2 FAILED] Error: ${msg}`);
      return { leadId, companyName: '', status: 'FAILED', error: msg };
    }

    const companyName = companyObj.name;

    // Cache check — if already COMPLETED, return cached data immediately
    if (companyObj.research?.status === 'COMPLETED') {
      console.log(
        `[RESEARCH] [CACHE HIT] Research already COMPLETED for "${companyName}". Returning cached result.`
      );
      return { leadId, companyName, status: 'COMPLETED' };
    }

    // Step 3: Upsert research record → set status to PROCESSING
    const research = await prisma.companyResearch.upsert({
      where: { companyId: companyObj.id },
      create: { companyId: companyObj.id, status: 'PROCESSING' },
      update: {
        status: 'PROCESSING',
        errorMessage: null,
        retryCount: { increment: companyObj.research ? 1 : 0 },
      },
    });

    try {
      // Step 3 & 4: Call AI Research Providers
      const { intelligence, rawResponse } = await researchCompanyWithAI(
        companyName,
        companyObj.website || leadObj.website
      );

      const durationMs = Date.now() - startTime;
      console.log(
        `[RESEARCH] [STEP 4] Response received: Provider = "${intelligence.providerUsed}", Duration = ${durationMs}ms`
      );

      // Step 5: Save Research Data to Database
      const updatedCompany = await prisma.company.update({
        where: { id: companyObj.id },
        data: {
          industry: intelligence.industry || companyObj.industry,
          description: intelligence.description || null,
          products: intelligence.products,
          services: intelligence.services,
          headquarters: intelligence.headquarters || null,
          companySize: intelligence.companySize || null,
          targetCustomers: intelligence.targetCustomers || null,
          techStack: intelligence.techStack,
          website:
            companyObj.website ||
            (intelligence.detectedWebsite ? intelligence.detectedWebsite : null),
        },
      });

      const updatedResearch = await prisma.companyResearch.update({
        where: { id: research.id },
        data: {
          status: 'COMPLETED',
          summary: intelligence.summary,
          painPoints: intelligence.painPoints,
          opportunities: intelligence.opportunities,
          rawAiResponse: rawResponse,
          lastResearched: new Date(),
          errorMessage: null,
        },
      });

      console.log(
        `[RESEARCH] [STEP 5] Database saved: Company ID = ${updatedCompany.id}, Research ID = ${updatedResearch.id}, Status = COMPLETED`
      );

      // Step 6: Response Returned
      console.log(`[RESEARCH] [STEP 6] Response returned: Lead ID = ${leadId}, Status = COMPLETED`);

      return { leadId, companyName, status: 'COMPLETED' };
    } catch (err: unknown) {
      const rawError = (err as Error).message ?? 'Unknown research error';
      console.error(`[RESEARCH] [FAILED] Research error for "${companyName}": ${rawError}`);

      // Map to clear error message categories
      let categorizedError = rawError;
      if (rawError.includes('MISSING_KEY')) {
        categorizedError =
          'Missing API key: Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in backend/.env';
      } else if (rawError.includes('TIMEOUT')) {
        categorizedError =
          'Network timeout: AI research service request timed out after 30 seconds';
      } else if (rawError.includes('RATE_LIMIT')) {
        categorizedError = 'Rate limit exceeded: AI provider rate limit or quota reached';
      } else if (rawError.includes('INVALID_COMPANY_NAME')) {
        categorizedError = 'Invalid company name: Company name must be a valid non-empty string';
      }

      await prisma.companyResearch.update({
        where: { id: research.id },
        data: {
          status: 'FAILED',
          errorMessage: categorizedError,
        },
      });

      console.log(`[RESEARCH] [STEP 6] Response returned: Lead ID = ${leadId}, Status = FAILED`);
      return { leadId, companyName, status: 'FAILED', error: categorizedError };
    }
  }

  /**
   * Bulk research — run sequentially with progress tracking.
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

    if (lead.companyId) {
      await prisma.companyResearch.updateMany({
        where: { companyId: lead.companyId },
        data: { status: 'PENDING', errorMessage: null },
      });
    }

    return ResearchService.researchCompany(userId, leadId);
  }

  /**
   * Get company + research data for a specific lead.
   */
  static async getResearchByLead(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      select: { id: true, company: true, companyId: true },
    });

    if (!lead) throw new Error('LEAD_NOT_FOUND: Lead not found');

    // If companyId is missing, attempt auto-linking first
    if (!lead.companyId && lead.company) {
      try {
        const { company } = await ResearchService.getOrCreateCompany(userId, leadId);
        lead.companyId = company.id;
      } catch {
        return null;
      }
    }

    if (!lead.companyId) return null;

    const company = await prisma.company.findFirst({
      where: { id: lead.companyId, userId },
      include: { research: true },
    });

    if (!company) return null;

    return {
      ...serializeDates(company as unknown as Record<string, unknown>),
      research: company.research
        ? serializeDates(company.research as unknown as Record<string, unknown>)
        : null,
    };
  }

  /**
   * Get research status for multiple leads in one call.
   */
  static async getBulkResearchStatus(userId: string, leadIds: string[]) {
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, userId },
      select: {
        id: true,
        companyId: true,
        companyRef: {
          include: { research: { select: { status: true, lastResearched: true } } },
        },
      },
    });

    return leads.map((l) => ({
      leadId: l.id,
      companyId: l.companyId,
      researchStatus: l.companyRef?.research?.status ?? null,
      lastResearched: l.companyRef?.research?.lastResearched?.toISOString() ?? null,
    }));
  }
}
