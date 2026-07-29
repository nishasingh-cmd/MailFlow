import { prisma } from '../../config/db';
import { parseFileBuffer, parseAllRows } from '../../utils/fileParser';
import {
  ColumnMapping,
  LeadValidationResult,
  DuplicateLeadRow,
  InvalidLeadRow,
  ImportLeadsRequest,
  ImportLeadsResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadQueryFilters,
  PaginatedLeadsResponse,
  LeadStatus,
} from '@mailflow/shared';

// RFC 5322 Compliant Email Regex Validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export class LeadsService {
  /**
   * Parse uploaded file buffer and return column preview + auto mapping
   */
  static parsePreview(fileBuffer: Buffer, fileName: string, fileSize: number) {
    return parseFileBuffer(fileBuffer, fileName, fileSize);
  }

  /**
   * Validate raw file rows using user column mapping & detect duplicates vs database and intra-file
   */
  static async validateMappingAndDuplicates(
    userId: string,
    fileBuffer: Buffer,
    mapping: ColumnMapping
  ): Promise<LeadValidationResult> {
    const rawRows = parseAllRows(fileBuffer);
    const totalRows = rawRows.length;

    // Retrieve existing lead emails for this user to check DB duplicates
    const existingLeads = await prisma.lead.findMany({
      where: { userId },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingLeads.map((l) => l.email.toLowerCase()));

    const validLeads: Array<{
      name: string;
      email: string;
      company?: string;
      phone?: string;
      website?: string;
      linkedin?: string;
      industry?: string;
    }> = [];

    const duplicates: DuplicateLeadRow[] = [];
    const invalidRows: InvalidLeadRow[] = [];
    const seenEmailsInFile = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNumber = index + 1;
      const reasons: string[] = [];

      // Extract values based on mapping
      const rawName = mapping.name ? (row[mapping.name] ?? '').trim() : '';
      const rawEmail = mapping.email ? (row[mapping.email] ?? '').trim().toLowerCase() : '';
      const company = mapping.company ? (row[mapping.company] ?? '').trim() : '';
      const phone = mapping.phone ? (row[mapping.phone] ?? '').trim() : '';
      const website = mapping.website ? (row[mapping.website] ?? '').trim() : '';
      const linkedin = mapping.linkedin ? (row[mapping.linkedin] ?? '').trim() : '';
      const industry = mapping.industry ? (row[mapping.industry] ?? '').trim() : '';

      // Ignore completely empty rows
      const hasAnyContent = Object.values(row).some((val) => val.trim().length > 0);
      if (!hasAnyContent) {
        return; // Skip empty row
      }

      // Check required fields
      if (!rawEmail) {
        reasons.push('Missing email address');
      } else if (!EMAIL_REGEX.test(rawEmail)) {
        reasons.push(`Invalid email format: "${rawEmail}"`);
      }

      if (!rawName) {
        reasons.push('Missing contact name');
      }

      // If invalid format or missing required fields, record as invalid
      if (reasons.length > 0) {
        invalidRows.push({
          rowNumber,
          data: row,
          reasons,
        });
        return;
      }

      // Check for duplicates (File Duplicate or Database Duplicate)
      if (seenEmailsInFile.has(rawEmail)) {
        duplicates.push({
          rowNumber,
          email: rawEmail,
          name: rawName,
          company,
          type: 'FILE_DUPLICATE',
        });
        return;
      }

      if (existingEmailSet.has(rawEmail)) {
        duplicates.push({
          rowNumber,
          email: rawEmail,
          name: rawName,
          company,
          type: 'DATABASE_DUPLICATE',
        });
        seenEmailsInFile.add(rawEmail);
        return;
      }

      // Mark as seen and valid
      seenEmailsInFile.add(rawEmail);
      validLeads.push({
        name: rawName,
        email: rawEmail,
        company: company || undefined,
        phone: phone || undefined,
        website: website || undefined,
        linkedin: linkedin || undefined,
        industry: industry || undefined,
      });
    });

    return {
      totalRows,
      validCount: validLeads.length,
      duplicateCount: duplicates.length,
      invalidCount: invalidRows.length,
      validLeads,
      duplicates,
      invalidRows,
    };
  }

  /**
   * Execute Lead Import transaction: Save leads & create ImportHistory record
   */
  static async executeImport(
    userId: string,
    payload: ImportLeadsRequest
  ): Promise<ImportLeadsResponse> {
    const { fileName, fileSize, totalRows, validLeads, duplicateCount, failedCount } = payload;

    return await prisma.$transaction(async (tx) => {
      // 1. Create ImportHistory record
      const historyRecord = await tx.importHistory.create({
        data: {
          userId,
          fileName,
          fileSize,
          totalRows,
          importedCount: validLeads.length,
          failedCount,
          duplicateCount,
        },
      });

      // 2. Batch insert valid leads into database
      if (validLeads.length > 0) {
        await tx.lead.createMany({
          data: validLeads.map((lead) => ({
            userId,
            importHistoryId: historyRecord.id,
            name: lead.name,
            email: lead.email.toLowerCase(),
            company: lead.company,
            phone: lead.phone,
            website: lead.website,
            linkedin: lead.linkedin,
            industry: lead.industry,
            status: 'NEW',
          })),
          skipDuplicates: true,
        });
      }

      return {
        importHistoryId: historyRecord.id,
        importedCount: validLeads.length,
        failedCount,
        duplicateCount,
        message: `Successfully imported ${validLeads.length} leads.`,
      };
    });
  }

  /**
   * Get paginated leads with search, status filtering, and sorting
   */
  static async getLeads(userId: string, query: LeadQueryFilters): Promise<PaginatedLeadsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = { userId };

    // Search filter across name, email, company
    if (query.search && query.search.trim()) {
      const searchStr = query.search.trim();
      whereClause.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { email: { contains: searchStr, mode: 'insensitive' } },
        { company: { contains: searchStr, mode: 'insensitive' } },
        { industry: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (query.status && query.status !== 'ALL') {
      whereClause.status = query.status as LeadStatus;
    }

    // Import history filter
    if (query.importHistoryId) {
      whereClause.importHistoryId = query.importHistoryId;
    }

    // Sorting
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      leads: leads.map((l) => ({
        id: l.id,
        userId: l.userId,
        importHistoryId: l.importHistoryId,
        name: l.name,
        email: l.email,
        company: l.company,
        phone: l.phone,
        website: l.website,
        linkedin: l.linkedin,
        industry: l.industry,
        status: l.status as LeadStatus,
        customFields: (l.customFields as Record<string, unknown>) ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get single lead by ID
   */
  static async getLeadById(userId: string, id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, userId },
      include: { importHistory: true },
    });

    if (!lead) {
      throw new Error('LEAD_NOT_FOUND');
    }

    return {
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }

  /**
   * Create single lead manually
   */
  static async createLead(userId: string, data: CreateLeadRequest) {
    const existing = await prisma.lead.findUnique({
      where: { userId_email: { userId, email: data.email.toLowerCase() } },
    });

    if (existing) {
      throw new Error('DUPLICATE_LEAD_EMAIL');
    }

    const lead = await prisma.lead.create({
      data: {
        userId,
        name: data.name,
        email: data.email.toLowerCase(),
        company: data.company,
        phone: data.phone,
        website: data.website,
        linkedin: data.linkedin,
        industry: data.industry,
        status: (data.status as LeadStatus) ?? 'NEW',
      },
    });

    return {
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }

  /**
   * Update lead details
   */
  static async updateLead(userId: string, id: string, data: UpdateLeadRequest) {
    const lead = await prisma.lead.findFirst({ where: { id, userId } });
    if (!lead) {
      throw new Error('LEAD_NOT_FOUND');
    }

    if (data.email && data.email.toLowerCase() !== lead.email) {
      const existing = await prisma.lead.findUnique({
        where: { userId_email: { userId, email: data.email.toLowerCase() } },
      });
      if (existing) {
        throw new Error('DUPLICATE_LEAD_EMAIL');
      }
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email ? data.email.toLowerCase() : undefined,
        company: data.company,
        phone: data.phone,
        website: data.website,
        linkedin: data.linkedin,
        industry: data.industry,
        status: data.status ? (data.status as LeadStatus) : undefined,
      },
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete single lead
   */
  static async deleteLead(userId: string, id: string) {
    const lead = await prisma.lead.findFirst({ where: { id, userId } });
    if (!lead) {
      throw new Error('LEAD_NOT_FOUND');
    }

    await prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted successfully' };
  }

  /**
   * Bulk delete leads
   */
  static async bulkDeleteLeads(userId: string, ids: string[]) {
    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} leads.`,
    };
  }

  /**
   * Get user import history
   */
  static async getImportHistory(userId: string) {
    const history = await prisma.importHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    }));
  }
}
