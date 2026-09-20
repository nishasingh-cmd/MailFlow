import { Prisma } from '@prisma/client';
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

    // Extract unique headers in original order from the file
    const headerSet = new Set<string>();
    rawRows.forEach((r) => {
      Object.keys(r).forEach((k) => {
        const trimmed = k.trim();
        if (trimmed) headerSet.add(trimmed);
      });
    });
    const uploadedColumns = Array.from(headerSet);

    // Retrieve existing lead emails for this user to check DB duplicates
    const existingLeads = await prisma.lead.findMany({
      where: { userId },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingLeads.map((l) => l.email.toLowerCase()));

    const validLeads: Array<{
      name?: string;
      email?: string;
      company?: string;
      phone?: string;
      website?: string;
      linkedin?: string;
      industry?: string;
      customFields?: Record<string, unknown>;
    }> = [];

    const duplicates: DuplicateLeadRow[] = [];
    const invalidRows: InvalidLeadRow[] = [];
    const seenEmailsInFile = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNumber = index + 1;
      const reasons: string[] = [];

      // Extract values based on mapping if provided
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

      // Check email format only if a rawEmail was present
      if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
        reasons.push(`Invalid email format: "${rawEmail}"`);
      }

      // If invalid format, record as invalid
      if (reasons.length > 0) {
        invalidRows.push({
          rowNumber,
          data: row,
          reasons,
        });
        return;
      }

      // If rawEmail is provided, check for duplicates
      if (rawEmail) {
        if (seenEmailsInFile.has(rawEmail)) {
          duplicates.push({
            rowNumber,
            email: rawEmail,
            name: rawName || company || `Lead #${rowNumber}`,
            company,
            type: 'FILE_DUPLICATE',
          });
          return;
        }

        if (existingEmailSet.has(rawEmail)) {
          duplicates.push({
            rowNumber,
            email: rawEmail,
            name: rawName || company || `Lead #${rowNumber}`,
            company,
            type: 'DATABASE_DUPLICATE',
          });
          seenEmailsInFile.add(rawEmail);
          return;
        }

        seenEmailsInFile.add(rawEmail);
      }

      // Generate surrogate internal email if no email was present, to satisfy database constraints
      const effectiveEmail =
        rawEmail ||
        `noemail-${Date.now()}-${rowNumber}-${Math.random().toString(36).substring(2, 7)}@internal.mailflow`;
      const effectiveName =
        rawName ||
        company ||
        Object.values(row).find((v) => v && v.trim().length > 0) ||
        `Lead #${rowNumber}`;

      // Store ALL uploaded columns and their exact values in customFields, plus _uploadedColumns metadata
      const customFields: Record<string, unknown> = {
        _uploadedColumns: uploadedColumns,
      };

      uploadedColumns.forEach((colHeader) => {
        const val =
          row[colHeader] !== undefined
            ? row[colHeader]
            : Object.entries(row).find(([k]) => k.trim() === colHeader)?.[1];
        if (val !== undefined && val !== null) {
          customFields[colHeader] = typeof val === 'string' ? val.trim() : val;
        }
      });

      validLeads.push({
        name: effectiveName,
        email: effectiveEmail,
        company: company || undefined,
        phone: phone || undefined,
        website: website || undefined,
        linkedin: linkedin || undefined,
        industry: industry || undefined,
        customFields,
      });
    });

    return {
      totalRows,
      validCount: validLeads.length,
      duplicateCount: duplicates.length,
      invalidCount: invalidRows.length,
      uploadedColumns,
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
    const {
      fileName,
      fileSize,
      totalRows,
      validLeads,
      duplicateCount,
      failedCount,
      uploadedColumns,
    } = payload;

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
          data: validLeads.map((lead, idx) => ({
            userId,
            importHistoryId: historyRecord.id,
            name: lead.name || `Lead #${idx + 1}`,
            email: lead.email
              ? lead.email.toLowerCase()
              : `noemail-${historyRecord.id}-${idx + 1}@internal.mailflow`,
            company: lead.company,
            phone: lead.phone,
            website: lead.website,
            linkedin: lead.linkedin,
            industry: lead.industry,
            customFields: (lead.customFields as Prisma.InputJsonValue) ?? Prisma.JsonNull,
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
        uploadedColumns,
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
        lastInboundMessageAt: l.lastInboundMessageAt ? l.lastInboundMessageAt.toISOString() : null,
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
        customFields: (data.customFields as Prisma.InputJsonValue) ?? Prisma.JsonNull,
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
        customFields:
          data.customFields !== undefined
            ? ((data.customFields as Prisma.InputJsonValue) ?? Prisma.JsonNull)
            : undefined,
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
