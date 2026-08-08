import { PrismaClient, QueueJobStatus, Prisma } from '@prisma/client';
import { WhatsappGeneratorService } from './whatsapp-generator.service';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { env } from '../../config/env';

const prisma = new PrismaClient();

export class WhatsappService {
  /**
   * Save or update WhatsApp draft message for a lead
   */
  static async saveDraft(
    userId: string,
    input: { leadId: string; campaignId?: string; message: string }
  ) {
    const existing = await prisma.whatsappDraft.findFirst({
      where: { userId, leadId: input.leadId },
    });

    if (existing) {
      const updated = await prisma.whatsappDraft.update({
        where: { id: existing.id },
        data: {
          message: input.message,
          campaignId: input.campaignId || null,
          status: 'DRAFT',
        },
      });
      return updated;
    }

    const draft = await prisma.whatsappDraft.create({
      data: {
        userId,
        leadId: input.leadId,
        campaignId: input.campaignId || null,
        message: input.message,
        status: 'DRAFT',
      },
    });

    return draft;
  }

  /**
   * Queue WhatsApp messages for Sending (Individually, Selected, or All)
   */
  static async enqueueMessages(
    userId: string,
    input: {
      leadId?: string;
      leadIds?: string[];
      campaignId?: string;
      templateId?: string;
      templateName?: string;
      templateParams?: string[];
      message?: string;
      variables?: Record<string, string>;
      sendAll?: boolean;
      phone?: string;
    }
  ) {
    let targetLeads: Array<{
      id: string;
      name: string;
      email: string;
      company: string | null;
      phone: string | null;
      lastInboundMessageAt?: Date | null;
    }>;

    const rawLeadIds = input.leadIds || (input.leadId ? [input.leadId] : []);

    if (input.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: input.campaignId, userId },
        include: { campaignLeads: { include: { lead: true } } },
      });
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      targetLeads = campaign.campaignLeads.map((cl) => cl.lead);
    } else if (input.sendAll) {
      targetLeads = await prisma.lead.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          lastInboundMessageAt: true,
        },
      });
    } else if (rawLeadIds.length > 0) {
      targetLeads = await prisma.lead.findMany({
        where: { userId, id: { in: rawLeadIds } },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          lastInboundMessageAt: true,
        },
      });
    } else {
      throw new Error('Please select at least one recipient lead.');
    }

    if (targetLeads.length === 0) {
      throw new Error('No valid leads selected for WhatsApp outreach.');
    }

    // Optionally fetch template if templateId is specified
    let template: { id: string; body: string } | null = null;
    if (input.templateId) {
      const client = prisma as unknown as {
        whatsappTemplate?: {
          findFirst: (args: unknown) => Promise<{ id: string; body: string } | null>;
        };
      };
      template =
        (await client.whatsappTemplate?.findFirst({
          where: { id: input.templateId, userId },
          select: { id: true, body: true },
        })) || null;
    }

    // Process leads and generate/retrieve message per lead
    const queueItems: Prisma.WhatsappQueueUncheckedCreateInput[] = [];

    for (const lead of targetLeads) {
      const activePhone = input.phone?.trim() || lead.phone?.trim();

      if (!activePhone) {
        if (targetLeads.length === 1) {
          throw new Error(
            `Lead "${lead.name}" has no phone number. Please update the phone number in Lead Management.`
          );
        }
        console.warn(`[Lead] Skipping lead ${lead.id} (${lead.name}) — missing phone number.`);
        continue;
      }

      // Check 24-hour customer service window
      const lastInbound = lead.lastInboundMessageAt;
      const isWithin24h =
        !!lastInbound && Date.now() - new Date(lastInbound).getTime() < 24 * 60 * 60 * 1000;

      let sendType: 'TEMPLATE' | 'TEXT' = 'TEXT';
      let useTemplate = false;
      let templateName: string | null = null;
      let templateParams: string[] | null = null;

      if (!isWithin24h) {
        sendType = 'TEMPLATE';
        useTemplate = true;
        templateName = input.templateName || env.WHATSAPP_DEFAULT_TEMPLATE_NAME || 'cold_outreach';
        if (input.templateParams) {
          templateParams = input.templateParams;
        } else if (templateName === 'hello_world') {
          templateParams = [];
        } else {
          templateParams = [lead.name || 'there'];
        }
      }

      let messageText: string = input.message || '';

      if (useTemplate) {
        if (!messageText) {
          messageText = `[Template Send: ${templateName}]`;
        }
      } else {
        if (template) {
          const mergedVars: Record<string, string> = {
            contact_name: lead.name,
            name: lead.name,
            company_name: lead.company || 'your company',
            company: lead.company || 'your company',
            email: lead.email,
            phone: activePhone,
            ...(input.variables || {}),
          };
          messageText = WhatsappTemplateService.substituteVariables(template.body, mergedVars);
        } else if (!messageText) {
          const draft = await prisma.whatsappDraft.findFirst({
            where: { userId, leadId: lead.id },
          });
          if (draft?.message) {
            messageText = draft.message;
          } else {
            const generated = await WhatsappGeneratorService.generateMessage(userId, lead.id);
            messageText = generated.message;
          }
        }
      }

      queueItems.push({
        userId,
        campaignId: input.campaignId || null,
        leadId: lead.id,
        phone: activePhone,
        message: messageText,
        sendType,
        useTemplate,
        templateName,
        templateParams: templateParams
          ? (templateParams as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        status: 'PENDING' as QueueJobStatus,
        attempts: 0,
        maxRetries: 3,
      });
    }

    if (queueItems.length === 0) {
      throw new Error('No leads with valid phone numbers were found to queue.');
    }

    // Insert into database queue using transaction for verified commit and explicit logging
    const createdJobs = await prisma.$transaction(
      queueItems.map((item) =>
        prisma.whatsappQueue.create({
          data: item,
        })
      )
    );

    return {
      message: `${createdJobs.length} WhatsApp message(s) queued for sending.`,
      count: createdJobs.length,
      jobs: createdJobs,
    };
  }

  /**
   * Get paginated WhatsApp delivery logs & history
   */
  static async getWhatsappHistory(
    userId: string,
    query: { search?: string; status?: string; campaignId?: string; page?: number; limit?: number }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WhatsappLogWhereInput = { userId };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.search) {
      where.OR = [
        { phone: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { lead: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.whatsappLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lead: { select: { name: true, email: true, phone: true, company: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.whatsappLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get failed WhatsApp queue items
   */
  static async getFailedQueue(
    userId: string,
    query: { search?: string; campaignId?: string; page?: number; limit?: number }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WhatsappQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.search) {
      where.OR = [
        { phone: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { lead: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.whatsappQueue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          lead: { select: { name: true, email: true, phone: true, company: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.whatsappQueue.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retry failed WhatsApp jobs
   */
  static async retryFailedJobs(userId: string, jobIds?: string[]) {
    const where: Prisma.WhatsappQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (jobIds && jobIds.length > 0) {
      where.id = { in: jobIds };
    }

    const failedJobs = await prisma.whatsappQueue.findMany({
      where,
      include: { lead: { select: { id: true, name: true, phone: true } } },
    });

    let reQueuedCount = 0;
    for (const job of failedJobs) {
      const activePhone = job.lead?.phone || job.phone;

      await prisma.whatsappQueue.update({
        where: { id: job.id },
        data: {
          phone: activePhone,
          status: 'PENDING',
          attempts: 0,
          errorMessage: null,
          scheduledAt: new Date(),
        },
      });
      reQueuedCount++;
    }

    return {
      message: `${reQueuedCount} failed WhatsApp job(s) re-queued with latest recipient phone numbers.`,
      count: reQueuedCount,
    };
  }

  /**
   * Delete failed WhatsApp queue jobs
   */
  static async deleteFailedJobs(userId: string, jobIds?: string[]) {
    const where: Prisma.WhatsappQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (jobIds && jobIds.length > 0) {
      where.id = { in: jobIds };
    }

    const deleted = await prisma.whatsappQueue.deleteMany({
      where,
    });

    return {
      message: `${deleted.count} failed job(s) deleted.`,
      count: deleted.count,
    };
  }

  /**
   * Get WhatsApp statistics
   */
  static async getStats(userId: string) {
    const [totalSent, deliveredCount, readCount, pending, failed, config] = await Promise.all([
      prisma.whatsappLog.count({
        where: { userId, status: { in: ['SENT', 'DELIVERED', 'READ'] } },
      }),
      prisma.whatsappLog.count({ where: { userId, status: { in: ['DELIVERED', 'READ'] } } }),
      prisma.whatsappLog.count({ where: { userId, status: 'READ' } }),
      prisma.whatsappQueue.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.whatsappQueue.count({ where: { userId, status: 'FAILED' } }),
      prisma.whatsappConfig.findUnique({ where: { userId } }),
    ]);

    const totalProcessed = totalSent + failed;
    const successRate = totalProcessed > 0 ? Math.round((totalSent / totalProcessed) * 100) : 100;
    const deliveryRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 0;
    const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

    return {
      totalSent,
      delivered: deliveredCount,
      read: readCount,
      pending,
      failed,
      successRate,
      deliveryRate,
      readRate,
      provider: config?.provider || 'MOCK',
    };
  }

  /**
   * Get single WhatsApp message log or queue details by ID
   */
  static async getMessageById(userId: string, id: string) {
    const log = await prisma.whatsappLog.findFirst({
      where: { id, userId },
      include: {
        lead: { select: { name: true, email: true, phone: true, company: true } },
        campaign: { select: { name: true } },
      },
    });

    if (log) return log;

    const queue = await prisma.whatsappQueue.findFirst({
      where: { id, userId },
      include: {
        lead: { select: { name: true, email: true, phone: true, company: true } },
        campaign: { select: { name: true } },
      },
    });

    return queue;
  }
}
