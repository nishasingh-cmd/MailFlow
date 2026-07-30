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
    });

    if (pendingJobs.length === 0) return;

    const provider = WhatsappProviderFactory.getProvider();

    for (const job of pendingJobs) {
      const attempts = job.attempts + 1;

      // Mark as PROCESSING
      await prisma.whatsappQueue.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING' as QueueJobStatus,
          attempts,
          lastAttemptAt: new Date(),
        },
      });

      try {
        const result = await provider.sendMessage({
          phone: job.phone,
          message: job.message,
          userId: job.userId,
          leadId: job.leadId,
          campaignId: job.campaignId || undefined,
        });

        const sentTime = new Date();

        // Mark as SENT
        await prisma.whatsappQueue.update({
          where: { id: job.id },
          data: {
            status: 'SENT' as QueueJobStatus,
            sentAt: sentTime,
            messageId: result.messageId,
          },
        });

        // Create log entry
        await prisma.whatsappLog.create({
          data: {
            userId: job.userId,
            campaignId: job.campaignId,
            leadId: job.leadId,
            queueId: job.id,
            phone: job.phone,
            message: job.message,
            status: 'SENT',
            provider: result.provider,
            retryCount: attempts - 1,
            messageId: result.messageId,
            sentAt: sentTime,
          },
        });

        // Update Lead status to CONTACTED
        await prisma.lead
          .update({
            where: { id: job.leadId },
            data: { status: 'CONTACTED' },
          })
          .catch(() => {});
      } catch (error: unknown) {
        const err = error as { message?: string };
        const errorMessage = err.message || 'WhatsApp delivery failed';
        console.error(
          `[WhatsappWorker] Job ${job.id} failed (attempt ${attempts}/${job.maxRetries}):`,
          errorMessage
        );

        if (attempts >= job.maxRetries) {
          // Final failure
          await prisma.whatsappQueue.update({
            where: { id: job.id },
            data: {
              status: 'FAILED' as QueueJobStatus,
              errorMessage,
            },
          });

          await prisma.whatsappLog.create({
            data: {
              userId: job.userId,
              campaignId: job.campaignId,
              leadId: job.leadId,
              queueId: job.id,
              phone: job.phone,
              message: job.message,
              status: 'FAILED',
              provider: provider.name,
              retryCount: attempts - 1,
              errorReason: errorMessage,
            },
          });
        } else {
          // Exponential backoff: 30s, 2m, 5m
          const backoffMs =
            attempts === 1 ? 30 * 1000 : attempts === 2 ? 2 * 60 * 1000 : 5 * 60 * 1000;
          const nextSchedule = new Date(Date.now() + backoffMs);

          await prisma.whatsappQueue.update({
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
  }
}
