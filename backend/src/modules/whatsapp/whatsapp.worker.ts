import { PrismaClient, QueueJobStatus, CampaignStatus } from '@prisma/client';
import { WhatsappProviderFactory } from './whatsapp-provider';

const prisma = new PrismaClient();

export class WhatsappWorker {
  private static isRunning = false;
  private static timerId: NodeJS.Timeout | null = null;

  /**
   * Start background WhatsApp delivery queue worker
   */
  static startWorker(intervalMs = 2500) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[WhatsappWorker] Background WhatsApp delivery queue worker started.');

    this.timerId = setInterval(async () => {
      try {
        await this.processQueueBatch();
      } catch (error) {
        console.error('[WhatsappWorker] Worker loop error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop worker loop
   */
  static stopWorker() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    console.log('[WhatsappWorker] Background WhatsApp delivery queue worker stopped.');
  }

  /**
   * Process pending WhatsApp jobs in batches
   */
  static async processQueueBatch() {
    const now = new Date();

    // Fetch batch of PENDING WhatsApp jobs scheduled for now or earlier
    const pendingJobs = await prisma.whatsappQueue.findMany({
      where: {
        status: 'PENDING' as QueueJobStatus,
        scheduledAt: { lte: now },
      },
      take: 5, // Process up to 5 jobs per batch tick
      orderBy: { scheduledAt: 'asc' },
      include: { lead: { select: { id: true, name: true, phone: true } } },
    });

    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      const activePhone = job.lead?.phone || job.phone;
      const attempts = job.attempts + 1;

      // Atomic lock status transition: PENDING -> PROCESSING ("Sending")
      const lockResult = await prisma.whatsappQueue.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING' as QueueJobStatus,
          phone: activePhone,
          attempts,
          lastAttemptAt: new Date(),
        },
      });

      if (lockResult.count === 0) {
        // Job was already claimed or cancelled
        continue;
      }

      console.log(
        `[WhatsApp SEND] User: ${job.userId} | Lead: ${job.lead?.name || 'Unknown'} (${job.leadId}) | Phone: "${activePhone}" | Queue ID: ${job.id} | Attempt: ${attempts}/${job.maxRetries}`
      );

      let provider;
      try {
        provider = await WhatsappProviderFactory.getProviderForUser(job.userId);
        console.log(`[Provider] Selected Provider: ${provider.name} for Queue ID: ${job.id}`);

        const result = await provider.sendMessage({
          phone: activePhone,
          message: job.message,
          userId: job.userId,
          leadId: job.leadId,
          campaignId: job.campaignId || undefined,
          useTemplate: job.useTemplate || job.sendType === 'TEMPLATE',
          templateName: job.templateName || undefined,
          templateParams: (job.templateParams as string[]) || undefined,
        });

        const sentTime = new Date();
        const finalSentMessage = result.finalMessage || job.message;

        // Transition status: PROCESSING -> SENT
        await prisma.whatsappQueue.update({
          where: { id: job.id },
          data: {
            status: 'SENT' as QueueJobStatus,
            phone: activePhone,
            message: finalSentMessage,
            sentAt: sentTime,
            messageId: result.messageId,
          },
        });

        // Create log entry in Delivery History
        const logEntry = await prisma.whatsappLog.create({
          data: {
            userId: job.userId,
            campaignId: job.campaignId,
            leadId: job.leadId,
            queueId: job.id,
            phone: activePhone,
            message: finalSentMessage,
            status: 'SENT',
            provider: result.provider,
            retryCount: attempts - 1,
            messageId: result.messageId,
            sentAt: sentTime,
          },
        });

        console.log(
          `[WhatsApp RESULT] Queue ID: ${job.id} | Status: SENT | Provider: ${result.provider} | Meta Message ID: ${result.messageId} | Log ID: ${logEntry.id}`
        );

        // Update Lead status to CONTACTED
        await prisma.lead
          .update({
            where: { id: job.leadId },
            data: { status: 'CONTACTED' },
          })
          .catch(() => {});
      } catch (error: unknown) {
        const err = error as Error;
        const errorMessage = err.message || 'WhatsApp delivery failed';
        const providerName = provider?.name || 'META_CLOUD';

        console.error(
          `[Worker] ❌ Queue ID ${job.id} FAILED on attempt ${attempts}/${job.maxRetries}:`,
          err.stack || err
        );

        // Transition status: PROCESSING -> FAILED
        await prisma.whatsappQueue.update({
          where: { id: job.id },
          data: {
            status: 'FAILED' as QueueJobStatus,
            errorMessage,
          },
        });

        // Create log entry in Delivery History & Failed Queue
        const logEntry = await prisma.whatsappLog.create({
          data: {
            userId: job.userId,
            campaignId: job.campaignId,
            leadId: job.leadId,
            queueId: job.id,
            phone: activePhone,
            message: job.message,
            status: 'FAILED',
            provider: providerName,
            retryCount: attempts - 1,
            errorReason: errorMessage,
          },
        });

        console.log(
          `[Worker] Queue ID: ${job.id} status updated to FAILED | Log ID: ${logEntry.id} created in Delivery History & Failed Queue.`
        );
      }

      if (job.campaignId) {
        await checkCampaignCompletion(job.userId, job.campaignId);
      }
    }
  }
}

async function checkCampaignCompletion(userId: string, campaignId: string) {
  const [emailPending, waPending] = await Promise.all([
    prisma.emailQueue.count({
      where: { campaignId, userId, status: { in: ['PENDING', 'PROCESSING'] } },
    }),
    prisma.whatsappQueue.count({
      where: { campaignId, userId, status: { in: ['PENDING', 'PROCESSING'] } },
    }),
  ]);

  if (emailPending + waPending === 0) {
    const [emailFailed, emailSent, waFailed, waSent] = await Promise.all([
      prisma.emailQueue.count({ where: { campaignId, userId, status: 'FAILED' } }),
      prisma.emailQueue.count({ where: { campaignId, userId, status: 'SENT' } }),
      prisma.whatsappQueue.count({ where: { campaignId, userId, status: 'FAILED' } }),
      prisma.whatsappQueue.count({ where: { campaignId, userId, status: 'SENT' } }),
    ]);

    const sentCount = emailSent + waSent;
    const failedCount = emailFailed + waFailed;

    let finalStatus = 'COMPLETED';
    if (sentCount > 0 && failedCount > 0) finalStatus = 'COMPLETED_WITH_ERRORS';
    else if (sentCount === 0 && failedCount > 0) finalStatus = 'FAILED';

    await prisma.campaign
      .update({
        where: { id: campaignId },
        data: { status: finalStatus as CampaignStatus, completedAt: new Date() },
      })
      .catch(() => {});
  }
}
