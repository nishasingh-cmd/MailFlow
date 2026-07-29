/**
 * MailFlow — Research Service
 * Phase 6: AI Company Research
 *
 * Orchestrates company research: website detection, AI intelligence gathering,
 * caching, and status tracking.
 */
import { prisma } from '../../config/db';
import { researchCompanyWithAI } from '../../services/gemini.service';
import { ResearchProgressResponse } from '@mailflow/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
  ) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Research Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export class ResearchService {
  /**
   * Get or create a Company record for a given lead.
   * Uses the lead's company name as the unique key per user.
   */
  static async getOrCreateCompany(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) throw new Error('LEAD_NOT_FOUND');
    if (!lead.company) throw new Error('LEAD_NO_COMPANY: Lead has no company name to research');

    // Upsert company by (userId, name)
    const company = await prisma.company.upsert({
      where: { userId_name: { userId, name: lead.company } },
      create: {
        userId,
        name: lead.company,
        website: lead.website ?? null,
        industry: lead.industry ?? null,
        products: [],
        services: [],
        techStack: [],
      },
      update: {
        // Only backfill website / industry if not already set
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

    return company;
  }

  /**
   * Research a single lead's company. Skips if already COMPLETED (cache hit).
   */
  static async researchCompany(
    userId: string,
    leadId: string
  ): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
  }> {
    // 1. Get or create the company
    let company;
    try {
      company = await ResearchService.getOrCreateCompany(userId, leadId);
    } catch (err) {
      const msg = (err as Error).message;
      return { leadId, companyName: '', status: 'FAILED', error: msg };
    }

    const companyName = company.name;

    // 2. Cache check — if already COMPLETED, reuse it
    if (company.research?.status === 'COMPLETED') {
      return { leadId, companyName, status: 'COMPLETED' };
    }

    // 3. Upsert research record → set to PROCESSING
    const research = await prisma.companyResearch.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, status: 'PROCESSING' },
      update: {
        status: 'PROCESSING',
        errorMessage: null,
        retryCount: { increment: company.research ? 1 : 0 },
      },
    });

    try {
      // 4. Call Gemini AI
      const { intelligence, rawResponse } = await researchCompanyWithAI(
        companyName,
        company.website
      );

      // 5. Update Company with gathered intelligence
      await prisma.company.update({
        where: { id: company.id },
        data: {
          industry: intelligence.industry || company.industry,
          description: intelligence.description || null,
          products: intelligence.products,
          services: intelligence.services,
          headquarters: intelligence.headquarters || null,
          companySize: intelligence.companySize || null,
          targetCustomers: intelligence.targetCustomers || null,
          techStack: intelligence.techStack,
          // Detect website if missing
          website:
            company.website || (intelligence.detectedWebsite ? intelligence.detectedWebsite : null),
        },
      });

      // 6. Update research record → COMPLETED
      await prisma.companyResearch.update({
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

      return { leadId, companyName, status: 'COMPLETED' };
    } catch (err) {
      const errorMessage = (err as Error).message ?? 'Unknown AI error';

      // Mark as FAILED
      await prisma.companyResearch.update({
        where: { id: research.id },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      return { leadId, companyName, status: 'FAILED', error: errorMessage };
    }
  }

  /**
   * Bulk research — run sequentially with progress tracking.
   * Returns a progress summary.
   */
  static async bulkResearch(userId: string, leadIds: string[]): Promise<ResearchProgressResponse> {
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
   * Retry a failed research.
   */
  static async retryResearch(userId: string, leadId: string) {
    // Reset status to PENDING first, then re-run
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) throw new Error('LEAD_NOT_FOUND');

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

    if (!lead) throw new Error('LEAD_NOT_FOUND');
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
   * Get research status for multiple leads in one call (for table display).
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
