import { PrismaClient, CampaignStatus, QueueJobStatus, Prisma } from '@prisma/client';
import { personalizeText } from '../../utils/personalization';
import { SmtpService } from '../smtp/smtp.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WhatsappGeneratorService } from '../whatsapp/whatsapp-generator.service';
import { TrackingService } from '../tracking/tracking.service';

const prisma = new PrismaClient();

function normalizeTemplateName(name?: string | null): string {
  if (!name) return 'cold_outreach';
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('follow')) return 'follow_up';
  if (clean.includes('partner')) return 'partnership';
  if (clean.includes('demo')) return 'product_demo';
  if (clean.includes('custom')) return 'custom_template';
  return 'cold_outreach';
}

interface LeadWithDrafts {
  emailDrafts?: Array<{
    template?: string | null;
    subject?: string | null;
    body?: string | null;
  }>;
}

function resolveCampaignEmailContent(
  campaignTemplateId: string | null | undefined,
  lead: LeadWithDrafts
): { subject: string; body: string } {
  const normCampaign = normalizeTemplateName(campaignTemplateId);

  // 1. If lead has drafts, check if any draft matches the current campaign template
  if (Array.isArray(lead.emailDrafts) && lead.emailDrafts.length > 0) {
    const matchingDraft = lead.emailDrafts.find(
      (d) => normalizeTemplateName(d.template) === normCampaign
    );
    if (matchingDraft && matchingDraft.subject && matchingDraft.body) {
      return {
        subject: matchingDraft.subject,
        body: matchingDraft.body,
      };
    }
  }

  const company = lead.company || lead.companyRef?.name || 'your company';
  const industry = lead.industry || lead.companyRef?.industry || 'your industry';

  switch (normCampaign) {
    case 'follow_up':
      return {
        subject: `Re: Thoughts for ${company}`,
        body: `Hi {{firstName}},\n\nCircling back on my previous note — I know how full schedules get while driving initiatives at ${company}.\n\nJust wanted to share a quick benchmark: peers in ${industry} recently saw a 3.4x bump in reply rates after switching to automated account research. The setup is completely frictionless with no workflow disruption.\n\nWould you have 5 minutes this Thursday afternoon for a quick check-in, or should I circle back next month?\n\nBest regards,\nMailFlow Team`,
      };
    case 'partnership':
      return {
        subject: `Strategic collaboration idea between MailFlow and ${company}`,
        body: `Hi {{firstName}},\n\nGiven ${company}'s strong standing and footprint in the ${industry} space, I wanted to reach out regarding a potential mutual partnership.\n\nWe frequently work with forward-thinking leaders at teams like ${company} who want to broaden their service capabilities and unlock new client revenue streams without additional overhead. Our partner ecosystem empowers teams to embed AI-driven prospect intelligence directly into their offering.\n\nWould you or your team be open to exploring potential synergies over a brief introductory call this week?\n\nBest regards,\nMailFlow Team`,
      };
    case 'product_demo':
      return {
        subject: `10-minute interactive walkthrough for ${company}`,
        body: `Hi {{firstName}},\n\nI noticed ${company}'s ongoing efforts to streamline outreach performance across ${industry}.\n\nMost teams are exhausted by juggling disjointed tools for prospect lists, AI copywriting, and multi-channel delivery. I've assembled a tailored live walkthrough demonstrating how MailFlow solves this by unifying lead enrichment, email generation, and WhatsApp outreach for ${company}.\n\nCan I send across a quick 1-click link to schedule a 10-minute demo customized for ${company}?\n\nBest regards,\nMailFlow Team`,
      };
    case 'custom_template':
      return {
        subject: `Tailored outreach initiative for ${company}`,
        body: `Hi {{firstName}},\n\nReaching out specifically regarding ${company}'s strategic initiatives in ${industry}.\n\nEvery campaign has unique requirements, brand voice guidelines, and conversion triggers. MailFlow's AI adapts directly to your custom instructions, producing bespoke messaging tuned to your business profile.\n\nLet me know if you'd be interested in reviewing how we can tailor this for your goals.\n\nBest regards,\nMailFlow Team`,
      };
    case 'cold_outreach':
    default:
      return {
        subject: `Quick idea regarding ${company}'s growth pipeline`,
        body: `Hi {{firstName}},\n\nI came across ${company}'s work in ${industry} and was really impressed by your team's positioning.\n\nMany teams at ${company}'s scale find it challenging to scale outbound messaging without losing deep account personalization. At MailFlow, we built an AI engine that researches each lead and drafts high-converting outreach in seconds.\n\nWould you be open to a brief 10-minute chat next Tuesday to explore if this fits ${company}'s current workflow?\n\nBest regards,\nMailFlow Team`,
      };
  }
}

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
                research: true,
                companyRef: true,
                emailDrafts: {
                  orderBy: { updatedAt: 'desc' },
                  take: 5,
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
    const rawContent = resolveCampaignEmailContent(campaign.templateId, lead);

    const personalizedSubject = personalizeText(rawContent.subject, lead);
    const personalizedBody = personalizeText(rawContent.body, lead);

    let whatsappPreview = null;
    const channel = campaign.channel || 'EMAIL';
    if (channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP') {
      try {
        whatsappPreview = await WhatsappGeneratorService.generateTemplateVariables(userId, lead.id);
      } catch (err) {
        console.warn(
          `[DeliveryService] Error generating WhatsApp preview for lead ${lead.id}:`,
          err
        );
      }
    }

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      channel,
      template: campaign.templateId || 'Cold Outreach',
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        industry: lead.industry,
      },
      subject: personalizedSubject,
      htmlBody: personalizedBody,
      whatsappPreview,
      totalLeads: campaign.campaignLeads.length,
    };
  }

  /**
   * Start sending campaign — supports Email, WhatsApp, and Email+WhatsApp multi-channel outreach.
   */
  static async startSending(
    userId: string,
    campaignId: string,
    options?: { speed?: 'FAST' | 'NORMAL' | 'SLOW' }
  ) {
    // 1. Fetch campaign and leads
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        campaignLeads: {
          include: {
            lead: {
              include: {
                research: true,
                companyRef: true,
                emailDrafts: {
                  orderBy: { updatedAt: 'desc' },
                  take: 5,
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

    const channel = campaign.channel || 'EMAIL';
    const includesEmail = channel === 'EMAIL' || channel === 'EMAIL_AND_WHATSAPP';
    const includesWhatsapp = channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP';

    // 2. Verify SMTP credentials if campaign includes Email outreach
    if (includesEmail) {
      const smtp = await SmtpService.getConfig(userId);
      if (!smtp || !smtp.hasPassword) {
        throw new Error(
          'SMTP configuration missing. Please configure and verify your SMTP settings in Settings before launching email campaigns.'
        );
      }
    }

    // 3. Update status to QUEUED
    const speed = options?.speed || campaign.sendingSpeed || 'NORMAL';
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'QUEUED' as CampaignStatus,
        sendingSpeed: speed,
        startedAt: campaign.startedAt || new Date(),
      },
    });

    // 4. Enqueue Email queue jobs (if channel includes Email)
    if (includesEmail) {
      const existingQueueJobs = await prisma.emailQueue.findMany({
        where: { campaignId, userId },
        select: { leadId: true },
      });
      const existingLeadIds = new Set(existingQueueJobs.map((j) => j.leadId));

      const newLeads = campaign.campaignLeads.filter((cl) => !existingLeadIds.has(cl.leadId));

      if (newLeads.length > 0) {
        const queueEntries = newLeads.map((cl) => {
          const lead = cl.lead;
          const rawContent = resolveCampaignEmailContent(campaign.templateId, lead);

          const subject = personalizeText(rawContent.subject, lead);
          const htmlBody = personalizeText(rawContent.body, lead);

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

      await prisma.emailQueue.updateMany({
        where: { campaignId, userId, status: 'CANCELLED' },
        data: { status: 'PENDING' },
      });
    }

    // 5. Enqueue WhatsApp queue jobs (if channel includes WhatsApp)
    if (includesWhatsapp) {
      const leadIds = campaign.campaignLeads.map((cl) => cl.leadId);
      if (leadIds.length > 0) {
        await WhatsappService.enqueueMessages(userId, {
          campaignId,
          leadIds,
        }).catch((err) => {
          console.error(
            `[DeliveryService] Error enqueuing WhatsApp messages for campaign ${campaignId}:`,
            err
          );
        });
      }
    }

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

    // Cancel all PENDING / PROCESSING queue jobs in both Email and WhatsApp queues
    await Promise.all([
      prisma.emailQueue.updateMany({
        where: {
          campaignId,
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        data: {
          status: 'CANCELLED' as QueueJobStatus,
        },
      }),
      prisma.whatsappQueue.updateMany({
        where: {
          campaignId,
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        data: {
          status: 'CANCELLED' as QueueJobStatus,
        },
      }),
    ]);

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
   * Get live real-time campaign progress with detailed metrics across Email and WhatsApp
   */
  static async getCampaignProgress(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

    const [emailCounts, waCounts] = await Promise.all([
      prisma.emailQueue.groupBy({
        by: ['status'],
        where: { campaignId, userId },
        _count: { id: true },
      }),
      prisma.whatsappQueue.groupBy({
        by: ['status'],
        where: { campaignId, userId },
        _count: { id: true },
      }),
    ]);

    let total = 0;
    let sent = 0;
    let failed = 0;
    let pending = 0;

    [...emailCounts, ...waCounts].forEach((c) => {
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

    // Create initial emailLog record to get log.id for the tracking pixel
    const log = await prisma.emailLog.create({
      data: {
        userId,
        leadId: lead.id,
        recipientEmail: lead.email,
        subject: input.subject,
        status: 'SENT',
        provider: provider,
        retryCount: 0,
        sentAt: sentTime,
      },
    });

    try {
      // Wrap any URLs/links with smart click tracking redirect
      const rawHtml = input.body.replace(/\n/g, '<br />');
      const htmlWithTrackedLinks = await TrackingService.wrapLinksInHtml(rawHtml, log.id);
      const trackingPixel = await TrackingService.getTrackingPixelHtml(log.id);
      const emailHtml = `${htmlWithTrackedLinks}<br/><br/>${trackingPixel}`;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: lead.email,
        subject: input.subject,
        html: emailHtml,
        text: input.body,
      });

      const messageId = info?.messageId || null;

      if (messageId) {
        await prisma.emailLog
          .update({
            where: { id: log.id },
            data: { messageId },
          })
          .catch(() => {});
      }

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

      // Update log to FAILED
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            errorReason: errorMessage,
          },
        })
        .catch(() => {});

      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  /**
   * Get Email delivery statistics
   */
  static async getStats(userId: string) {
    const [totalSent, openedCount, failedLogs, pendingQueue, failedQueue, smtpConfig] =
      await Promise.all([
        prisma.emailLog.count({
          where: { userId, status: { in: ['SENT', 'OPENED'] } },
        }),
        prisma.emailLog.count({
          where: { userId, status: 'OPENED' },
        }),
        prisma.emailLog.count({
          where: { userId, status: 'FAILED' },
        }),
        prisma.emailQueue.count({
          where: { userId, status: { in: [QueueJobStatus.PENDING, QueueJobStatus.PROCESSING] } },
        }),
        prisma.emailQueue.count({
          where: { userId, status: QueueJobStatus.FAILED },
        }),
        prisma.smtpConfig.findUnique({
          where: { userId },
        }),
      ]);

    const totalFailed = failedLogs + failedQueue;
    const deliveredCount = totalSent;
    const totalAttempted = totalSent + totalFailed;
    const successRate = totalAttempted > 0 ? Math.round((totalSent / totalAttempted) * 100) : 100;
    const deliveryRate = totalSent > 0 ? 100 : 0;
    const openRate = totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : 0;

    let provider = 'NOT_CONFIGURED';
    if (smtpConfig) {
      provider = smtpConfig.provider || 'CUSTOM';
    }

    return {
      totalSent,
      delivered: deliveredCount,
      opened: openedCount,
      pending: pendingQueue,
      failed: totalFailed,
      successRate,
      deliveryRate,
      openRate,
      provider,
    };
  }
}
