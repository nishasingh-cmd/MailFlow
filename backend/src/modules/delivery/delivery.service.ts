import { PrismaClient, CampaignStatus, QueueJobStatus, Prisma } from '@prisma/client';
import { personalizeText } from '../../utils/personalization';
import { SmtpService } from '../smtp/smtp.service';

const prisma = new PrismaClient();

export class DeliveryService {
  /**
   * Get preview of personalized email for a campaign's lead before sending
   */
  static async getCampaignPreview(userId: string, campaignId: string, leadId?: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        campaignLeads: {
          take: 5,
          include: {
            lead: {
              include: {
                companyRef: {
                  include: { research: true },
                },
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
    if (campaign.campaignLeads.length === 0) {
      throw new Error('No leads in this campaign to preview.');
    }

    const selectedCl = leadId
      ? campaign.campaignLeads.find((cl) => cl.leadId === leadId) || campaign.campaignLeads[0]
      : campaign.campaignLeads[0];

    const lead = selectedCl.lead;
    const draft = lead.emailDrafts?.[0];

    const rawSubject = draft?.subject || `Outreach for ${lead.company || lead.name}`;
    const rawBody =
      draft?.body ||
      `Hi {{firstName}},\n\nI reached out because I noticed your work at {{company}} in the {{industry}} space.\n\nBest regards,\nMailFlow Team`;

    const personalizedSubject = personalizeText(rawSubject, lead);
    const personalizedBody = personalizeText(rawBody, lead);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      template: draft?.template || campaign.templateId || 'Cold Outreach',
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        industry: lead.industry,
      },
      subject: personalizedSubject,
      htmlBody: personalizedBody,
      totalLeads: campaign.campaignLeads.length,
    };
  }

  /**
   * Start sending campaign — enqueues personalized emails and sets status to SENDING
   */
  static async startSending(userId: string, campaignId: string) {
    // 1. Verify user has SMTP credentials configured
    const smtp = await SmtpService.getConfig(userId);
    if (!smtp || !smtp.hasPassword) {
      throw new Error(
        'SMTP configuration missing. Please configure and verify your SMTP settings before launching campaigns.'
      );
    }

    // 2. Fetch campaign and campaign leads
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        campaignLeads: {
          include: {
            lead: {
              include: {
                companyRef: {
                  include: { research: true },
                },
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
    if (campaign.campaignLeads.length === 0) {
      throw new Error('Cannot send campaign with 0 leads. Please add leads first.');
    }

    // 3. Check existing queue jobs for this campaign
    const existingCount = await prisma.emailQueue.count({
      where: { campaignId, userId },
    });

    if (existingCount === 0) {
      // Create queue jobs for each lead with personalized subject & body
      const queueEntries = campaign.campaignLeads.map((cl) => {
        const lead = cl.lead;
        const draft = lead.emailDrafts?.[0];

        const rawSubject = draft?.subject || `Outreach for ${lead.company || lead.name}`;
        const rawBody =
          draft?.body ||
          `Hi {{firstName}},\n\nI noticed your work at {{company}} in {{industry}}.\n\nBest regards,\nMailFlow Team`;

        const subject = personalizeText(rawSubject, lead);
        const htmlBody = personalizeText(rawBody, lead);

        return {
          userId,
          campaignId,
          leadId: lead.id,
          recipientEmail: lead.email,
          subject,
          htmlBody,
          status: 'PENDING' as QueueJobStatus,
          attempts: 0,
          maxRetries: 3,
        };
      });

      await prisma.emailQueue.createMany({
        data: queueEntries,
      });
    } else {
      // Resume any pending or failed jobs
      await prisma.emailQueue.updateMany({
        where: {
          campaignId,
          userId,
          status: { in: ['CANCELLED', 'FAILED'] },
          attempts: { lt: 3 },
        },
        data: {
          status: 'PENDING',
        },
      });
    }

    // 4. Update campaign status to SENDING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' as CampaignStatus },
    });

    return this.getCampaignProgress(userId, campaignId);
  }

  /**
   * Pause campaign sending
   */
  static async pauseSending(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' as CampaignStatus },
    });

    return this.getCampaignProgress(userId, campaignId);
  }

  /**
   * Resume campaign sending
   */
  static async resumeSending(userId: string, campaignId: string) {
    return this.startSending(userId, campaignId);
  }

  /**
   * Get real-time campaign progress statistics
   */
  static async getCampaignProgress(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

    const counts = await prisma.emailQueue.groupBy({
      by: ['status'],
      where: { campaignId, userId },
      _count: { id: true },
    });

    let total = 0;
    let sent = 0;
    let failed = 0;
    let pending = 0;

    counts.forEach((c) => {
      const cnt = c._count.id;
      total += cnt;
      if (c.status === 'SENT') sent += cnt;
      else if (c.status === 'FAILED') failed += cnt;
      else if (c.status === 'PENDING' || c.status === 'PROCESSING') pending += cnt;
    });

    const percentage = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      total,
      sent,
      failed,
      pending,
      percentage,
      batchSize: 20,
    };
  }

  /**
   * Get paginated delivery logs
   */
  static async getDeliveryLogs(
    userId: string,
    query: { search?: string; status?: string; campaignId?: string; page?: number; limit?: number }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailLogWhereInput = { userId };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.search) {
      where.OR = [
        { recipientEmail: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { lead: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lead: { select: { name: true, email: true, company: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.emailLog.count({ where }),
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
   * Get paginated failed queue items
   */
  static async getFailedQueue(
    userId: string,
    query: { search?: string; campaignId?: string; page?: number; limit?: number }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.search) {
      where.OR = [
        { recipientEmail: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { lead: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.emailQueue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          lead: { select: { name: true, email: true, company: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.emailQueue.count({ where }),
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
   * Retry failed queue jobs (selected or all)
   */
  static async retryFailedJobs(userId: string, jobIds?: string[]) {
    const where: Prisma.EmailQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (jobIds && jobIds.length > 0) {
      where.id = { in: jobIds };
    }

    // Reset status to PENDING and attempts to 0
    const updated = await prisma.emailQueue.updateMany({
      where,
      data: {
        status: 'PENDING',
        attempts: 0,
        errorMessage: null,
        scheduledAt: new Date(),
      },
    });

    // Also update any FAILED campaigns back to SENDING
    const failedJobs = await prisma.emailQueue.findMany({
      where: { userId, status: 'PENDING' },
      select: { campaignId: true },
      distinct: ['campaignId'],
    });

    for (const job of failedJobs) {
      await prisma.campaign.updateMany({
        where: { id: job.campaignId, status: { in: ['FAILED', 'COMPLETED'] } },
        data: { status: 'SENDING' },
      });
    }

    return {
      message: `${updated.count} failed email job(s) re-queued for sending.`,
      count: updated.count,
    };
  }

  /**
   * Delete failed queue jobs (selected or all)
   */
  static async deleteFailedJobs(userId: string, jobIds?: string[]) {
    const where: Prisma.EmailQueueWhereInput = {
      userId,
      status: 'FAILED',
    };

    if (jobIds && jobIds.length > 0) {
      where.id = { in: jobIds };
    }

    const deleted = await prisma.emailQueue.deleteMany({
      where,
    });

    return {
      message: `${deleted.count} failed job(s) deleted.`,
      count: deleted.count,
    };
  }
}
