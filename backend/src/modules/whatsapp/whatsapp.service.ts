import { PrismaClient, QueueJobStatus, Prisma } from '@prisma/client';
import { WhatsappGeneratorService } from './whatsapp-generator.service';

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
    input: { leadIds?: string[]; campaignId?: string; message?: string; sendAll?: boolean }
  ) {
    let targetLeads: Array<{ id: string; name: string; phone: string | null }>;

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
        select: { id: true, name: true, phone: true },
      });
    } else if (input.leadIds && input.leadIds.length > 0) {
      targetLeads = await prisma.lead.findMany({
        where: { userId, id: { in: input.leadIds } },
        select: { id: true, name: true, phone: true },
      });
    } else {
      throw new Error('Please select at least one recipient lead.');
    }

    if (targetLeads.length === 0) {
      throw new Error('No valid leads selected for WhatsApp outreach.');
    }

    // Process leads and generate/retrieve message per lead
    const queueItems: Array<{
      userId: string;
      campaignId?: string | null;
      leadId: string;
      phone: string;
      message: string;
      status: QueueJobStatus;
      attempts: number;
      maxRetries: number;
    }> = [];

    for (const lead of targetLeads) {
      const phone = lead.phone || '+15550000000'; // Default fallback phone for testing if phone omitted

      let messageText: string = input.message || '';

      // If message wasn't provided, generate or fetch draft
      if (!messageText) {
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

      queueItems.push({
        userId,
        campaignId: input.campaignId || null,
        leadId: lead.id,
        phone,
        message: messageText,
        status: 'PENDING' as QueueJobStatus,
        attempts: 0,
        maxRetries: 3,
      });
    }

    // Insert into database queue
    const created = await prisma.whatsappQueue.createMany({
      data: queueItems,
    });

    return {
      message: `${created.count} WhatsApp message(s) queued for sending.`,
      count: created.count,
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

    const updated = await prisma.whatsappQueue.updateMany({
      where,
      data: {
        status: 'PENDING',
        attempts: 0,
        errorMessage: null,
        scheduledAt: new Date(),
      },
    });

    return {
      message: `${updated.count} failed WhatsApp job(s) re-queued for sending.`,
      count: updated.count,
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
    const [totalSent, pending, failed] = await Promise.all([
      prisma.whatsappLog.count({ where: { userId, status: 'SENT' } }),
      prisma.whatsappQueue.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.whatsappQueue.count({ where: { userId, status: 'FAILED' } }),
    ]);

    const totalProcessed = totalSent + failed;
    const successRate = totalProcessed > 0 ? Math.round((totalSent / totalProcessed) * 100) : 100;

    return {
      totalSent,
      pending,
      failed,
      successRate,
    };
  }
}
