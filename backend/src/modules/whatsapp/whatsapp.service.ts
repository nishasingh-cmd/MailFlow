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
      console.log(
        `[Lead] Lead ID: ${lead.id} | Name: ${lead.name} | Phone: "${lead.phone || 'N/A'}"`
      );

      if (!lead.phone || !lead.phone.trim()) {
        if (targetLeads.length === 1) {
          throw new Error(
            `Lead "${lead.name}" has no phone number. Please update the phone number in Lead Management.`
          );
        }
        console.warn(`[Lead] Skipping lead ${lead.id} (${lead.name}) — missing phone number.`);
        continue;
      }

      const phone = lead.phone.trim();
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

    for (const job of createdJobs) {
      console.log(
        `[Queue] Created WhatsappQueue Record | Queue ID: ${job.id} | Lead ID: ${job.leadId} | Phone: "${job.phone}" | Status: ${job.status}`
      );
    }

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
      console.log(
        `[Retry Queue] Job ID: ${job.id} | Lead ID: ${job.leadId} | Syncing Queue Phone: "${job.phone}" -> Latest Lead Phone: "${activePhone}"`
      );

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
}
