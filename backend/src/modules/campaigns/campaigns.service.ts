import { PrismaClient, CampaignStatus, Prisma } from '@prisma/client';
import { UpdateCampaignInput, QueryCampaignsInput } from './campaigns.validation';

const prisma = new PrismaClient();

export class CampaignsService {
  /**
   * Create a new campaign with optional lead associations
   */
  static async createCampaign(userId: string, input: Record<string, unknown>) {
    const name = (input.name || input.campaignName) as string;
    const description = (input.description as string) || null;
    const leadIds = ((input.leadIds || input.selectedLeadIds) as string[]) || [];
    const templateId =
      ((input.templateId || input.selectedTemplate || input.template) as string) || null;
    const rawStatus = String(input.status || 'DRAFT').toUpperCase();
    const validStatuses = Object.values(CampaignStatus);
    const status = (
      validStatuses.includes(rawStatus as CampaignStatus) ? rawStatus : 'DRAFT'
    ) as CampaignStatus;

    const rawChannel = String(input.channel || 'EMAIL').toUpperCase();
    const validChannels = ['EMAIL', 'WHATSAPP', 'EMAIL_AND_WHATSAPP'];
    const channel = (validChannels.includes(rawChannel) ? rawChannel : 'EMAIL') as
      'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP';

    const datasetId = (input.datasetId as string) || null;
    const whatsappTemplateName = (input.whatsappTemplateName as string) || null;
    const whatsappVariableMapping =
      (input.whatsappVariableMapping as Prisma.InputJsonValue) || Prisma.JsonNull;

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        description,
        status,
        channel,
        templateId,
        datasetId,
        whatsappTemplateName,
        whatsappVariableMapping,
        campaignLeads:
          leadIds && leadIds.length > 0
            ? {
                create: leadIds.map((leadId: string) => ({ leadId })),
              }
            : undefined,
      },
      include: {
        _count: { select: { campaignLeads: true } },
      },
    });

    return campaign;
  }

  /**
   * Get paginated campaigns for a user with search, filter, and sorting
   */
  static async getCampaigns(userId: string, query: QueryCampaignsInput) {
    const { search, status, sortBy, sortOrder, page, limit } = query;

    // Build where clause
    const where: Prisma.CampaignWhereInput = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status as CampaignStatus;
    }

    // Build order clause
    let orderBy: Prisma.CampaignOrderByWithRelationInput = {};
    if (sortBy === 'leadCount') {
      orderBy = { campaignLeads: { _count: sortOrder } };
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const skip = (page - 1) * limit;

    const [campaigns, total, stats] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { campaignLeads: true } },
        },
      }),
      prisma.campaign.count({ where }),
      prisma.campaign.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const statsMap = { total: 0, draft: 0, ready: 0, completed: 0 };
    const allCount = await prisma.campaign.count({ where: { userId } });
    statsMap.total = allCount;
    stats.forEach((s) => {
      if (s.status === 'DRAFT') statsMap.draft = s._count.id;
      if (s.status === 'READY') statsMap.ready = s._count.id;
      if (s.status === 'COMPLETED') statsMap.completed = s._count.id;
    });

    return {
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: statsMap,
    };
  }

  /**
   * Get a single campaign with full lead details and email drafts
   */
  static async getCampaignById(userId: string, id: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { campaignLeads: true } },
        campaignLeads: {
          orderBy: { addedAt: 'asc' },
          include: {
            lead: {
              include: {
                emailDrafts: {
                  orderBy: { updatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
    return campaign;
  }

  /**
   * Update a campaign (name, description, status, leads, template)
   */
  static async updateCampaign(userId: string, id: string, input: UpdateCampaignInput) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

    // If leadIds provided, replace the entire lead set
    const leadUpdate =
      input.leadIds !== undefined
        ? {
            deleteMany: {},
            create: input.leadIds.map((leadId) => ({ leadId })),
          }
        : undefined;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status as CampaignStatus }),
        ...(input.channel !== undefined && { channel: input.channel }),
        ...(input.templateId !== undefined && { templateId: input.templateId }),
        ...(input.datasetId !== undefined && { datasetId: input.datasetId }),
        ...(input.whatsappTemplateName !== undefined && {
          whatsappTemplateName: input.whatsappTemplateName,
        }),
        ...(input.whatsappVariableMapping !== undefined && {
          whatsappVariableMapping:
            input.whatsappVariableMapping === null
              ? Prisma.JsonNull
              : (input.whatsappVariableMapping as Prisma.InputJsonValue),
        }),
        ...(leadUpdate && { campaignLeads: leadUpdate }),
      },
      include: {
        _count: { select: { campaignLeads: true } },
      },
    });

    return campaign;
  }

  /**
   * Add leads to an existing campaign without affecting existing ones
   */
  static async addLeadsToCampaign(userId: string, id: string, leadIds: string[]) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return this.getCampaignById(userId, id);
    }

    const validLeads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, userId },
      select: { id: true },
    });

    if (validLeads.length > 0) {
      await prisma.campaignLead.createMany({
        data: validLeads.map((l) => ({ campaignId: id, leadId: l.id })),
        skipDuplicates: true,
      });
    }

    return this.getCampaignById(userId, id);
  }

  /**
   * Remove a single lead from an existing campaign
   */
  static async removeLeadFromCampaign(userId: string, id: string, leadId: string) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

    await prisma.campaignLead.deleteMany({
      where: { campaignId: id, leadId },
    });

    return this.getCampaignById(userId, id);
  }

  /**
   * Batch remove multiple leads from an existing campaign
   */
  static async removeLeadsFromCampaign(userId: string, id: string, leadIds: string[]) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      await prisma.campaignLead.deleteMany({
        where: { campaignId: id, leadId: { in: leadIds } },
      });
    }

    return this.getCampaignById(userId, id);
  }

  /**
   * Delete a campaign — never deletes the leads themselves
   */
  static async deleteCampaign(userId: string, id: string) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

    await prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Duplicate a campaign — copies name (with "(Copy)"), description, leads, template
   * New status is always DRAFT
   */
  static async duplicateCampaign(userId: string, id: string) {
    const source = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        campaignLeads: { select: { leadId: true } },
        whatsappDrafts: true,
      },
    });

    if (!source) throw new Error('CAMPAIGN_NOT_FOUND');

    const copy = await prisma.campaign.create({
      data: {
        userId,
        name: `${source.name} (Copy)`,
        description: source.description,
        status: 'DRAFT',
        channel: source.channel,
        templateId: source.templateId,
        datasetId: source.datasetId,
        whatsappTemplateName: source.whatsappTemplateName,
        whatsappVariableMapping:
          (source.whatsappVariableMapping as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        sendingSpeed: source.sendingSpeed,
        campaignLeads:
          source.campaignLeads.length > 0
            ? {
                create: source.campaignLeads.map((cl) => ({ leadId: cl.leadId })),
              }
            : undefined,
      },
      include: {
        _count: { select: { campaignLeads: true } },
      },
    });

    // If source campaign had WhatsApp drafts, duplicate them for the new campaign in clean DRAFT state
    if (source.whatsappDrafts && source.whatsappDrafts.length > 0) {
      await prisma.whatsappDraft.createMany({
        data: source.whatsappDrafts.map((d) => ({
          userId,
          leadId: d.leadId,
          campaignId: copy.id,
          message: d.message,
          status: 'DRAFT',
        })),
        skipDuplicates: true,
      });
    }

    console.log(
      `[CampaignDuplicate] sourceCampaignId: ${source.id}, sourceChannel: ${source.channel}, duplicateChannel: ${copy.channel}`
    );

    if (copy.channel !== source.channel) {
      await prisma.campaign.delete({ where: { id: copy.id } }).catch(() => {});
      throw new Error(
        `DUPLICATE_CHANNEL_MISMATCH: Expected duplicate channel "${source.channel}", but received "${copy.channel}".`
      );
    }

    return copy;
  }

  /**
   * Get unique columns for a specific dataset/sheet belonging to the user.
   * Strictly enforces tenant isolation: checks ownership of importHistory.
   */
  static async getDatasetColumns(userId: string, datasetId: string) {
    if (!datasetId || typeof datasetId !== 'string') {
      throw new Error('DATASET_ID_REQUIRED');
    }

    if (datasetId.toUpperCase() === 'MANUAL') {
      const manualLeads = await prisma.lead.findMany({
        where: { userId, importHistoryId: null },
        take: 100,
        select: { customFields: true },
      });

      const colSet = new Set<string>();
      for (const lead of manualLeads) {
        if (lead.customFields && typeof lead.customFields === 'object') {
          for (const key of Object.keys(lead.customFields as Record<string, unknown>)) {
            if (key !== '_uploadedColumns') {
              colSet.add(key);
            }
          }
        }
      }

      const standardFields = [
        'Name',
        'Phone',
        'Email',
        'Company',
        'Industry',
        'Website',
        'LinkedIn',
      ];
      for (const sf of standardFields) {
        if (!Array.from(colSet).some((c) => c.toLowerCase() === sf.toLowerCase())) {
          colSet.add(sf);
        }
      }

      return {
        datasetId: 'MANUAL',
        datasetName: 'Manual & Direct Leads',
        columns: Array.from(colSet),
        totalRows: manualLeads.length,
      };
    }

    // Verify dataset ownership for strict tenant isolation
    const history = await prisma.importHistory.findFirst({
      where: { id: datasetId, userId },
    });

    if (!history) {
      throw new Error('DATASET_NOT_FOUND');
    }

    // Find leads for this specific dataset to extract columns
    const leads = await prisma.lead.findMany({
      where: { importHistoryId: datasetId, userId },
      take: 50,
      select: { customFields: true },
    });

    let sheetColumns: string[] = [];

    // Check if any lead has _uploadedColumns preserved from spreadsheet headers
    for (const lead of leads) {
      if (lead.customFields && typeof lead.customFields === 'object') {
        const cf = lead.customFields as Record<string, unknown>;
        if (Array.isArray(cf._uploadedColumns) && cf._uploadedColumns.length > 0) {
          sheetColumns = (cf._uploadedColumns as string[]).filter(
            (col) => typeof col === 'string' && col.trim().length > 0 && col !== '_uploadedColumns'
          );
          break;
        }
      }
    }

    // Fallback: If _uploadedColumns was not present, gather keys from customFields
    if (sheetColumns.length === 0) {
      const colSet = new Set<string>();
      for (const lead of leads) {
        if (lead.customFields && typeof lead.customFields === 'object') {
          for (const key of Object.keys(lead.customFields as Record<string, unknown>)) {
            if (key !== '_uploadedColumns') {
              colSet.add(key);
            }
          }
        }
      }
      sheetColumns = Array.from(colSet);
    }

    // Ensure standard fields (Name, Phone, Email, Company) are available
    const finalColumns = [...sheetColumns];
    const baseFields = ['Name', 'Phone', 'Email', 'Company'];
    for (const bf of baseFields) {
      if (!finalColumns.some((c) => c.toLowerCase() === bf.toLowerCase())) {
        finalColumns.push(bf);
      }
    }

    return {
      datasetId: history.id,
      datasetName: history.fileName,
      columns: finalColumns,
      totalRows: history.totalRows || history.importedCount,
    };
  }
}
