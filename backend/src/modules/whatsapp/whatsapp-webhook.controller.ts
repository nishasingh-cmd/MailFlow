import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../../config/env';

const prisma = new PrismaClient();

export class WhatsappWebhookController {
  /**
   * GET /api/whatsapp/webhook
   * Verification endpoint for Meta Webhook subscription
   */
  static async verifyWebhook(req: Request, res: Response): Promise<void> {
    try {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;

      if (mode !== 'subscribe' || !token) {
        res.status(403).json({ error: 'Forbidden: Invalid mode or missing verify token.' });
        return;
      }

      // Check verify token against database configs or env verify token
      const matchingConfigs = await prisma.whatsappConfig.findMany({
        where: { webhookVerifyToken: { not: null } },
        select: { webhookVerifyToken: true },
      });

      const validTokens = new Set([
        'mailflow_verify_token',
        'mailflow_webhook_secret',
        env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        ...matchingConfigs.map((c) => c.webhookVerifyToken).filter(Boolean),
      ]);

      if (validTokens.has(token)) {
        res.status(200).send(challenge);
        return;
      }

      console.warn('[WhatsappWebhook] ⚠️ Verify token mismatch:', token);
      res.status(403).send('Forbidden: Token mismatch');
    } catch (error) {
      console.error('[WhatsappWebhook.verifyWebhook] Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * POST /api/whatsapp/webhook
   * Receive real-time message status updates (sent, delivered, read, failed)
   */
  static async receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const appSecret = env.WHATSAPP_APP_SECRET;

      // Optional X-Hub-Signature-256 HMAC SHA256 signature verification
      if (signature && appSecret) {
        const expectedSig =
          'sha256=' +
          crypto.createHmac('sha256', appSecret).update(JSON.stringify(req.body)).digest('hex');
        if (signature !== expectedSig) {
          console.warn('[WhatsappWebhook] Invalid X-Hub-Signature-256 signature.');
          res.status(401).json({ error: 'Unauthorized: Invalid signature' });
          return;
        }
      }

      const body = req.body;

      // Ensure object is whatsapp_business_account
      if (body?.object !== 'whatsapp_business_account') {
        res.status(200).json({ status: 'ignored' });
        return;
      }

      const entries = body.entry || [];
      let processedCount = 0;

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || value.messaging_product !== 'whatsapp') continue;

          const statuses = value.statuses || [];

          for (const st of statuses) {
            const messageId = st.id;
            const statusStr = ((st.status as string) || '').toLowerCase(); // 'sent' | 'delivered' | 'read' | 'failed'
            const timestampSec = Number(st.timestamp) || Math.floor(Date.now() / 1000);
            const statusDate = new Date(timestampSec * 1000);

            // Find matching WhatsappLog by messageId
            const logEntry = await prisma.whatsappLog.findFirst({
              where: { messageId },
            });

            if (logEntry) {
              if (statusStr === 'delivered') {
                await prisma.whatsappLog.update({
                  where: { id: logEntry.id },
                  data: {
                    status: 'DELIVERED',
                    deliveredAt: logEntry.deliveredAt || statusDate,
                  },
                });
                if (logEntry.queueId) {
                  await prisma.whatsappQueue.updateMany({
                    where: { id: logEntry.queueId },
                    data: { deliveredAt: statusDate },
                  });
                }
              } else if (statusStr === 'read') {
                await prisma.whatsappLog.update({
                  where: { id: logEntry.id },
                  data: {
                    status: 'READ',
                    readAt: logEntry.readAt || statusDate,
                    deliveredAt: logEntry.deliveredAt || statusDate,
                  },
                });
                if (logEntry.queueId) {
                  await prisma.whatsappQueue.updateMany({
                    where: { id: logEntry.queueId },
                    data: { readAt: statusDate },
                  });
                }
              } else if (statusStr === 'failed') {
                const errObj = st.errors?.[0];
                const errorMsg = errObj?.title || errObj?.message || 'Meta delivery failed';

                await prisma.whatsappLog.update({
                  where: { id: logEntry.id },
                  data: {
                    status: 'FAILED',
                    errorReason: errorMsg,
                  },
                });
                if (logEntry.queueId) {
                  await prisma.whatsappQueue.updateMany({
                    where: { id: logEntry.queueId },
                    data: { status: 'FAILED', errorMessage: errorMsg },
                  });
                }
              }
              processedCount++;
            }
          }

          // Handle inbound messages (value.messages) sent from leads
          const messages = value.messages || [];
          if (messages.length > 0) {
            const phoneNumberId = value.metadata?.phone_number_id;
            const wabaId = entry.id;

            let config = null;
            if (phoneNumberId) {
              config = await prisma.whatsappConfig.findFirst({
                where: { phoneNumberId },
              });
            }
            if (!config && wabaId) {
              config = await prisma.whatsappConfig.findFirst({
                where: { businessAccountId: wabaId },
              });
            }
            if (!config) {
              config = await prisma.whatsappConfig.findFirst({
                where: { status: { in: ['CONNECTED', 'MOCK_ACTIVE'] } },
              });
            }

            const owningUserId = config?.userId;

            for (const msg of messages) {
              const rawFrom = msg.from;
              if (!rawFrom) continue;

              const cleanFromDigits = rawFrom.replace(/[^\d]/g, '');
              const timestampSec = Number(msg.timestamp) || Math.floor(Date.now() / 1000);
              const inboundDate = new Date(timestampSec * 1000);

              const messageText =
                msg.text?.body ||
                msg.button?.text ||
                msg.interactive?.button_reply?.title ||
                msg.type ||
                'Inbound WhatsApp Message';

              const leadWhere = owningUserId ? { userId: owningUserId } : {};
              const candidates = await prisma.lead.findMany({
                where: leadWhere,
                select: { id: true, userId: true, phone: true },
              });

              let matchedLead = candidates.find((l) => {
                if (!l.phone) return false;
                const cleanLeadPhone = l.phone.replace(/[^\d]/g, '');
                return (
                  cleanLeadPhone === cleanFromDigits ||
                  cleanLeadPhone.endsWith(cleanFromDigits) ||
                  cleanFromDigits.endsWith(cleanLeadPhone)
                );
              });

              if (!matchedLead && owningUserId) {
                const allLeads = await prisma.lead.findMany({
                  select: { id: true, userId: true, phone: true },
                });
                matchedLead = allLeads.find((l) => {
                  if (!l.phone) return false;
                  const cleanLeadPhone = l.phone.replace(/[^\d]/g, '');
                  return (
                    cleanLeadPhone === cleanFromDigits ||
                    cleanLeadPhone.endsWith(cleanFromDigits) ||
                    cleanFromDigits.endsWith(cleanLeadPhone)
                  );
                });
              }

              if (matchedLead) {
                await prisma.lead.update({
                  where: { id: matchedLead.id },
                  data: { lastInboundMessageAt: inboundDate },
                });

                await prisma.whatsappLog.create({
                  data: {
                    userId: matchedLead.userId,
                    leadId: matchedLead.id,
                    phone: rawFrom,
                    message: messageText,
                    status: 'RECEIVED',
                    direction: 'INBOUND',
                    provider: 'META_CLOUD',
                    messageId: msg.id || `inbound_${Date.now()}`,
                    sentAt: inboundDate,
                  },
                });

                console.log(
                  `[WhatsappWebhook] ✅ Captured inbound reply from Lead ID ${matchedLead.id} (${rawFrom}). Updated lastInboundMessageAt.`
                );
                processedCount++;
              } else {
                console.warn(
                  `[WhatsappWebhook] ⚠️ Received inbound message from ${rawFrom}, but no matching lead was found.`
                );
              }
            }
          }
        }
      }

      res.status(200).json({ success: true, processedCount });
    } catch (error) {
      console.error('[WhatsappWebhook.receiveWebhook] Error:', error);
      res.status(200).json({ success: false, error: 'Internal Error processing webhook' });
    }
  }
}
