import { PrismaClient, CampaignStatus, QueueJobStatus, Prisma } from '@prisma/client';
import { personalizeText } from '../../utils/personalization';
import { SmtpService } from '../smtp/smtp.service';

const prisma = new PrismaClient();

export class DeliveryService {
  /**
   * Get preview of personalized email for a campaign lead
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
      `Hi {{firstName}},\n\nI noticed your work at {{company}} in {{industry}}.\n\nBest regards,\nMailFlow Team`;

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
   * Start sending campaign — validates SMTP, enqueues personalized emails with duplicate protection,
   * sets status to QUEUED -> SENDING
   */
  static async startSending(
    userId: string,
    campaignId: string,
    options?: { speed?: 'FAST' | 'NORMAL' | 'SLOW' }
  ) {
    // 1. Verify user has SMTP credentials configured
    const smtp = await SmtpService.getConfig(userId);
    if (!smtp || !smtp.hasPassword) {
      throw new Error(
        'SMTP configuration missing. Please configure and verify your SMTP settings before launching campaigns.'
      );
    }

    // 2. Fetch campaign and leads
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

    // Update status to QUEUED
    const speed = options?.speed || campaign.sendingSpeed || 'NORMAL';
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'QUEUED' as CampaignStatus,
        sendingSpeed: speed,
        startedAt: campaign.startedAt || new Date(),
      },
    });

    // 3. Duplicate Protection: Check existing queue jobs for this campaign
    const existingQueueJobs = await prisma.emailQueue.findMany({
      where: { campaignId, userId },
      select: { leadId: true },
    });
    const existingLeadIds = new Set(existingQueueJobs.map((j) => j.leadId));

    // Filter leads that are not queued yet
    const newLeads = campaign.campaignLeads.filter((cl) => !existingLeadIds.has(cl.leadId));

    if (newLeads.length > 0) {
      const queueEntries = newLeads.map((cl) => {
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
        skipDuplicates: true,
      });
    }

    // Unpause or reset CANCELLED/FAILED jobs if restarting
    await prisma.emailQueue.updateMany({
      where: {
        campaignId,
        userId,
        status: 'CANCELLED',
      },
      data: {
        status: 'PENDING',
      },
    });

    // Update status to SENDING
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
   * Cancel campaign sending (remaining pending jobs become CANCELLED)
   */
  static async cancelSending(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

    // Cancel all PENDING / PROCESSING queue jobs
    await prisma.emailQueue.updateMany({
      where: {
        campaignId,
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: 'CANCELLED' as QueueJobStatus,
      },
    });

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'CANCELLED' as CampaignStatus,
        completedAt: new Date(),
      },
    });

    return this.getCampaignProgress(userId, campaignId);
  }

  /**
   * Get live real-time campaign progress with detailed metrics
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
    const successRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 100;

    // Calculate time taken
    let timeTaken = '—';
    if (campaign.startedAt) {
      const endTime = campaign.completedAt || new Date();
      const diffSec = Math.floor(
        (endTime.getTime() - new Date(campaign.startedAt).getTime()) / 1000
      );
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      timeTaken = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      total,
      sent,
      failed,
      pending,
      percentage,
      currentRecipient: campaign.lastSentEmail,
      sendingSpeed: (campaign.sendingSpeed || 'NORMAL') as 'FAST' | 'NORMAL' | 'SLOW',
      startedAt: campaign.startedAt?.toISOString() || null,
      completedAt: campaign.completedAt?.toISOString() || null,
      timeTaken,
      successRate,
    };
  }

  /**
   * Get paginated delivery logs with search & sort
   */
  static async getDeliveryLogs(
    userId: string,
    query: {
      search?: string;
      status?: string;
      campaignId?: string;
      sortBy?: 'createdAt' | 'recipientEmail' | 'subject';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
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

    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortOrder || 'desc';

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { [sortField]: sortDir },
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

    const updated = await prisma.emailQueue.updateMany({
      where,
      data: {
        status: 'PENDING',
        attempts: 0,
        errorMessage: null,
        scheduledAt: new Date(),
      },
    });

    // Re-open associated campaign status to SENDING
    const affectedJobs = await prisma.emailQueue.findMany({
      where: { userId, status: 'PENDING' },
      select: { campaignId: true },
      distinct: ['campaignId'],
    });

    for (const job of affectedJobs) {
      await prisma.campaign.updateMany({
        where: {
          id: job.campaignId,
          status: { in: ['FAILED', 'COMPLETED', 'COMPLETED_WITH_ERRORS'] },
        },
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

  /**
   * Send single email directly to a lead using user's configured SMTP credentials
   */
  static async sendSingleEmail(
    userId: string,
    input: { leadId: string; subject: string; body: string }
  ) {
    if (!input.leadId || !input.subject || !input.body) {
      throw new Error('Lead ID, subject, and body are required.');
    }

    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, userId },
    });

    if (!lead) {
      throw new Error('LEAD_NOT_FOUND: Recipient lead not found.');
    }

    if (!lead.email) {
      throw new Error('Lead does not have a valid email address.');
    }

    // Obtain user SMTP transport
    const { transporter, fromName, fromEmail, provider } =
      await SmtpService.getTransporterForUser(userId);

    const sentTime = new Date();

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: lead.email,
        subject: input.subject,
        html: input.body.replace(/\n/g, '<br />'),
        text: input.body,
      });

      const messageId = info?.messageId || null;

      // Log email delivery
      await prisma.emailLog.create({
        data: {
          userId,
          leadId: lead.id,
          recipientEmail: lead.email,
          subject: input.subject,
          status: 'SENT',
          provider: provider,
          retryCount: 0,
          messageId,
          sentAt: sentTime,
        },
      });

      // Update lead status to CONTACTED
      await prisma.lead
        .update({
          where: { id: lead.id },
          data: { status: 'CONTACTED' },
        })
        .catch(() => {});

      // Mark any pending/saved draft for this lead as SENT
      await prisma.emailDraft
        .updateMany({
          where: { leadId: lead.id, userId },
          data: { status: 'SENT' },
        })
        .catch(() => {});

      return {
        success: true,
        message: `Email sent successfully to ${lead.email}!`,
        recipientEmail: lead.email,
        sentAt: sentTime,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err.message || 'Email delivery failed';

      // Log failure in email logs
      await prisma.emailLog
        .create({
          data: {
            userId,
            leadId: lead.id,
            recipientEmail: lead.email,
            subject: input.subject,
            status: 'FAILED',
            provider: provider,
            retryCount: 0,
            errorReason: errorMessage,
          },
        })
        .catch(() => {});

      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
}
