import { PrismaClient, CampaignStatus, QueueJobStatus } from '@prisma/client';
import { SmtpService } from '../smtp/smtp.service';

const prisma = new PrismaClient();

export class DeliveryWorker {
  private static isRunning = false;
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Start the background delivery worker loop
   */
  static startWorker(intervalMs = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DeliveryWorker] Background email delivery worker started.');

    this.timerId = setInterval(async () => {
      try {
        await this.processQueueBatch();
      } catch (error) {
        console.error('[DeliveryWorker] Worker loop error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the background delivery worker loop
   */
  static stopWorker() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    console.log('[DeliveryWorker] Background email delivery worker stopped.');
  }

  /**
   * Process one batch of pending emails
   */
  static async processQueueBatch() {
    // 1. Find all active campaigns currently in SENDING status
    const activeCampaigns = await prisma.campaign.findMany({
      where: { status: 'SENDING' as CampaignStatus },
      select: { id: true, userId: true },
    });

    if (activeCampaigns.length === 0) return;

    for (const campaign of activeCampaigns) {
      const now = new Date();

      // 2. Fetch pending jobs for this campaign scheduled for now or earlier
      const pendingJobs = await prisma.emailQueue.findMany({
        where: {
          campaignId: campaign.id,
          userId: campaign.userId,
          status: 'PENDING' as QueueJobStatus,
          scheduledAt: { lte: now },
        },
        take: 20, // Configurable Batch Size: 20 emails per batch
        orderBy: { scheduledAt: 'asc' },
      });

      if (pendingJobs.length === 0) {
        // Check if campaign queue has completed all jobs
        await this.checkCampaignCompletion(campaign.userId, campaign.id);
        continue;
      }

      // 3. Obtain user SMTP transporter
      let smtpContext;
      try {
        smtpContext = await SmtpService.getTransporterForUser(campaign.userId);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`[DeliveryWorker] Campaign ${campaign.id} SMTP error:`, err.message);
        // Mark pending jobs as failed due to missing/invalid SMTP configuration
        await prisma.emailQueue.updateMany({
          where: { campaignId: campaign.id, status: 'PENDING' },
          data: {
            status: 'FAILED',
            errorMessage: err.message || 'SMTP Credentials invalid or unconfigured',
          },
        });
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'FAILED' as CampaignStatus },
        });
        continue;
      }

      const { transporter, fromName, fromEmail, provider } = smtpContext;

      // 4. Send each email in the batch
      for (const job of pendingJobs) {
        const attempts = job.attempts + 1;

        // Mark as PROCESSING
        await prisma.emailQueue.update({
          where: { id: job.id },
          data: {
            status: 'PROCESSING' as QueueJobStatus,
            attempts,
            lastAttemptAt: new Date(),
          },
        });

        try {
          await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: job.recipientEmail,
            subject: job.subject,
            html: job.htmlBody,
            text: job.htmlBody.replace(/<[^>]*>?/gm, ''), // Plaintext fallback
          });

          // SUCCESS
          const sentTime = new Date();
          await prisma.emailQueue.update({
            where: { id: job.id },
            data: {
              status: 'SENT' as QueueJobStatus,
              sentAt: sentTime,
            },
          });

          // Log delivery
          await prisma.emailLog.create({
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
              sentAt: sentTime,
            },
          });

          // Update Lead status to CONTACTED
          await prisma.lead
            .update({
              where: { id: job.leadId },
              data: { status: 'CONTACTED' },
            })
            .catch(() => {
              /* ignore lead status update errors */
            });
        } catch (sendError: unknown) {
          const err = sendError as { message?: string };
          const errorMessage = err.message || 'Email delivery failed';
          console.error(
            `[DeliveryWorker] Job ${job.id} failed (attempt ${attempts}/${job.maxRetries}):`,
            errorMessage
          );

          if (attempts >= job.maxRetries) {
            // Final failure
            await prisma.emailQueue.update({
              where: { id: job.id },
              data: {
                status: 'FAILED' as QueueJobStatus,
                errorMessage,
              },
            });

            // Log failure
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
            // Exponential backoff: 30s, 2m, 10m
            const backoffMs =
              attempts === 1 ? 30 * 1000 : attempts === 2 ? 2 * 60 * 1000 : 10 * 60 * 1000;
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

      // Check if campaign queue finished after batch
      await this.checkCampaignCompletion(campaign.userId, campaign.id);
    }
  }

  /**
   * Check if campaign has finished processing all queued jobs
   */
  private static async checkCampaignCompletion(userId: string, campaignId: string) {
    const remainingPendingOrProcessing = await prisma.emailQueue.count({
      where: {
        campaignId,
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (remainingPendingOrProcessing === 0) {
      const failedCount = await prisma.emailQueue.count({
        where: { campaignId, userId, status: 'FAILED' },
      });
      const sentCount = await prisma.emailQueue.count({
        where: { campaignId, userId, status: 'SENT' },
      });

      let finalStatus: CampaignStatus = 'COMPLETED';
      if (sentCount === 0 && failedCount > 0) {
        finalStatus = 'FAILED';
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: finalStatus },
      });
    }
  }
}
