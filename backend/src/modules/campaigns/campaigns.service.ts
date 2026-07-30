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
    const status = (
      ['DRAFT', 'READY', 'COMPLETED'].includes(rawStatus) ? rawStatus : 'DRAFT'
    ) as CampaignStatus;

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        description,
        status,
        templateId,
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
        ...(input.templateId !== undefined && { templateId: input.templateId }),
        ...(leadUpdate && { campaignLeads: leadUpdate }),
      },
      include: {
        _count: { select: { campaignLeads: true } },
      },
    });

    return campaign;
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
      },
    });

    if (!source) throw new Error('CAMPAIGN_NOT_FOUND');

    const copy = await prisma.campaign.create({
      data: {
        userId,
        name: `${source.name} (Copy)`,
        description: source.description,
        status: 'DRAFT',
        templateId: source.templateId,
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

    return copy;
  }
}
