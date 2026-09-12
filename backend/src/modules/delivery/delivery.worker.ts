import { PrismaClient, CampaignStatus, QueueJobStatus } from '@prisma/client';
import { SmtpService } from '../smtp/smtp.service';
import { TrackingService } from '../tracking/tracking.service';

const prisma = new PrismaClient();

export class DeliveryWorker {
  private static isRunning = false;
  private static isProcessing = false;
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Start background delivery worker loop
   */
  static startWorker(intervalMs = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DeliveryWorker] SaaS Email Delivery Engine worker running.');

    this.timerId = setInterval(async () => {
      try {
        await this.processQueueBatch();
      } catch (error) {
        console.error('[DeliveryWorker] Worker loop error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop background delivery worker loop
   */
  static stopWorker() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.isProcessing = false;
    console.log('[DeliveryWorker] Background email delivery worker stopped.');
  }

  /**
   * Process pending jobs per active campaign
   */
  static async processQueueBatch() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch campaigns in SENDING or QUEUED status
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          status: { in: ['SENDING', 'QUEUED'] as CampaignStatus[] },
        },
        select: { id: true, userId: true, sendingSpeed: true, status: true },
      });

      if (activeCampaigns.length === 0) return;

      for (const campaign of activeCampaigns) {
        // If QUEUED, transition status to SENDING
        if (campaign.status === 'QUEUED') {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'SENDING' as CampaignStatus, startedAt: new Date() },
          });
        }

        // Determine batch size per sending speed limit
        const speed = campaign.sendingSpeed || 'NORMAL';
        const batchLimit = speed === 'FAST' ? 20 : speed === 'SLOW' ? 1 : 5;

        const now = new Date();

        // Fetch batch of pending jobs
        const pendingJobs = await prisma.emailQueue.findMany({
          where: {
            campaignId: campaign.id,
            userId: campaign.userId,
            status: 'PENDING' as QueueJobStatus,
            scheduledAt: { lte: now },
          },
          take: batchLimit,
          orderBy: { scheduledAt: 'asc' },
        });

        if (pendingJobs.length === 0) {
          await this.checkCampaignCompletion(campaign.userId, campaign.id);
          continue;
        }

        // Obtain user SMTP transport
        let smtpContext;
        try {
          smtpContext = await SmtpService.getTransporterForUser(campaign.userId);
        } catch (error: unknown) {
          const err = error as { message?: string };
          console.error(`[DeliveryWorker] Campaign ${campaign.id} SMTP error:`, err.message);

          await prisma.emailQueue.updateMany({
            where: { campaignId: campaign.id, status: 'PENDING' },
            data: {
              status: 'FAILED',
              errorMessage: err.message || 'SMTP Credentials unconfigured or invalid',
            },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'FAILED' as CampaignStatus, completedAt: new Date() },
          });
          continue;
        }

        const { transporter, fromName, fromEmail, provider } = smtpContext;

        // Process batch
        for (const job of pendingJobs) {
          const attempts = job.attempts + 1;

          // Atomic lock: Transition PENDING -> PROCESSING
          const lockResult = await prisma.emailQueue.updateMany({
            where: { id: job.id, status: 'PENDING' },
            data: {
              status: 'PROCESSING' as QueueJobStatus,
              attempts,
              lastAttemptAt: new Date(),
            },
          });

          if (lockResult.count === 0) {
            // Job was already picked up or processed
            continue;
          }

          // Update lastSentEmail on campaign for live UI recipient tracker
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { lastSentEmail: job.recipientEmail },
          });

          try {
            // Create emailLog first to obtain log.id for the tracking pixel
            const log = await prisma.emailLog.create({
              data: {
                userId: job.userId,
                campaignId: job.campaignId,
                leadId: job.leadId,
                queueId: job.id,
                recipientEmail: job.recipientEmail,
                subject: job.subject,
                status: 'SENT',
                provider: provider,
                retryCount: attempts - 1,
                sentAt: new Date(),
              },
            });

            const htmlWithTrackedLinks = await TrackingService.wrapLinksInHtml(
              job.htmlBody,
              log.id
            );
            const trackingPixel = await TrackingService.getTrackingPixelHtml(log.id);
            const htmlWithPixel = `${htmlWithTrackedLinks}<br/><br/>${trackingPixel}`;

            const info = await transporter.sendMail({
              from: `"${fromName}" <${fromEmail}>`,
              to: job.recipientEmail,
              subject: job.subject,
              html: htmlWithPixel,
              text: job.htmlBody.replace(/<[^>]*>?/gm, ''),
            });

            const sentTime = new Date();
            const messageId = info?.messageId || null;

            // Mark job as SENT
            await prisma.emailQueue.update({
              where: { id: job.id },
              data: {
                status: 'SENT' as QueueJobStatus,
                sentAt: sentTime,
                messageId,
              },
            });

            if (messageId) {
              await prisma.emailLog
                .update({
                  where: { id: log.id },
                  data: { messageId, sentAt: sentTime },
                })
                .catch(() => {});
            }

            // Update Lead status to CONTACTED
            await prisma.lead
              .update({
                where: { id: job.leadId },
                data: { status: 'CONTACTED' },
              })
              .catch(() => {});
          } catch (sendError: unknown) {
            const err = sendError as { message?: string };
            const errorMessage = err.message || 'Email delivery failed';
            console.error(
              `[DeliveryWorker] Job ${job.id} failed (attempt ${attempts}/${job.maxRetries}):`,
              errorMessage
            );

            if (attempts >= job.maxRetries) {
              // Final failure -> status = FAILED
              await prisma.emailQueue.update({
                where: { id: job.id },
                data: {
                  status: 'FAILED' as QueueJobStatus,
                  errorMessage,
                },
              });

              await prisma.emailLog.create({
                data: {
                  userId: job.userId,
                  campaignId: job.campaignId,
                  leadId: job.leadId,
                  queueId: job.id,
                  recipientEmail: job.recipientEmail,
                  subject: job.subject,
                  status: 'FAILED',
                  provider: provider,
                  retryCount: attempts - 1,
                  errorReason: errorMessage,
                },
              });
            } else {
              // Automatic retries: 30s, 2m, 5m
              const backoffMs =
                attempts === 1 ? 30 * 1000 : attempts === 2 ? 2 * 60 * 1000 : 5 * 60 * 1000;
              const nextSchedule = new Date(Date.now() + backoffMs);

              await prisma.emailQueue.update({
                where: { id: job.id },
                data: {
                  status: 'PENDING' as QueueJobStatus,
                  scheduledAt: nextSchedule,
                  errorMessage: `Attempt ${attempts} failed: ${errorMessage}. Retrying at ${nextSchedule.toLocaleTimeString()}`,
                },
              });
            }
          }
        }

        await this.checkCampaignCompletion(campaign.userId, campaign.id);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check campaign queue status and transition status when completed
   */
  private static async checkCampaignCompletion(userId: string, campaignId: string) {
    const [emailPending, waPending] = await Promise.all([
      prisma.emailQueue.count({
        where: {
          campaignId,
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
      prisma.whatsappQueue.count({
        where: {
          campaignId,
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
    ]);

    const remainingPendingOrProcessing = emailPending + waPending;

    if (remainingPendingOrProcessing === 0) {
      const [emailFailed, emailSent, waFailed, waSent] = await Promise.all([
        prisma.emailQueue.count({ where: { campaignId, userId, status: 'FAILED' } }),
        prisma.emailQueue.count({ where: { campaignId, userId, status: 'SENT' } }),
        prisma.whatsappQueue.count({ where: { campaignId, userId, status: 'FAILED' } }),
        prisma.whatsappQueue.count({ where: { campaignId, userId, status: 'SENT' } }),
      ]);

      const sentCount = emailSent + waSent;
      const failedCount = emailFailed + waFailed;

      let finalStatus: CampaignStatus = 'COMPLETED';
      if (sentCount > 0 && failedCount > 0) {
        finalStatus = 'COMPLETED_WITH_ERRORS';
      } else if (sentCount === 0 && failedCount > 0) {
        finalStatus = 'FAILED';
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });
    }
  }
}
