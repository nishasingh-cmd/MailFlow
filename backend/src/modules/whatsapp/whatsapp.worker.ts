import { PrismaClient, QueueJobStatus } from '@prisma/client';
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

      console.log(
        `[Worker] Processing Queue ID: ${job.id} | Lead ID: ${job.leadId} | Target Phone: "${activePhone}" | Attempt: ${attempts}/${job.maxRetries}`
      );

      // Transition status: PENDING -> PROCESSING ("Sending")
      await prisma.whatsappQueue.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING' as QueueJobStatus,
          phone: activePhone,
          attempts,
          lastAttemptAt: new Date(),
        },
      });

      console.log(`[Queue] Status Transition | Queue ID: ${job.id} | New Status: PROCESSING`);

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

        // Transition status: PROCESSING -> SENT
        await prisma.whatsappQueue.update({
          where: { id: job.id },
          data: {
            status: 'SENT' as QueueJobStatus,
            phone: activePhone,
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
            message: job.message,
            status: 'SENT',
            provider: result.provider,
            retryCount: attempts - 1,
            messageId: result.messageId,
            sentAt: sentTime,
          },
        });

        console.log(
          `[Worker] ✅ Queue ID: ${job.id} SENT SUCCESSFULLY | Log ID: ${logEntry.id} | Provider: ${result.provider} | Meta Message ID: ${result.messageId}`
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
    }
  }
}
