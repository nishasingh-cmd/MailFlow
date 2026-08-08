import { PrismaClient } from '@prisma/client';
import { decrypt } from '../../utils/crypto';

const prisma = new PrismaClient();

export interface WhatsappSendOptions {
  phone: string;
  message: string;
  userId: string;
  leadId?: string;
  campaignId?: string;
  templateName?: string;
  useTemplate?: boolean;
  templateParams?: string[];
}

export interface WhatsappSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  error?: string;
}

export interface IWhatsappProvider {
  name: string;
  sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult>;
}

type MetaApiSendResponse = {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
    code?: number;
    error_user_msg?: string;
  };
};

type MetaApiTestResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  error?: {
    message?: string;
    code?: number;
  };
};

/**
 * Mock WhatsApp Provider — Simulates sending with 2–4s network latency when no API credentials exist.
 */
export class MockWhatsappProvider implements IWhatsappProvider {
  name = 'MOCK';

  async sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult> {
    const delayMs = 1500 + Math.floor(Math.random() * 1500);

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const cleanPhone = opts.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error(`Invalid recipient phone number format: "${opts.phone}".`);
    }

    const mockMessageId = `wa_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      messageId: mockMessageId,
      provider: this.name,
    };
  }
}

/**
 * Meta WhatsApp Cloud API Provider — Official WhatsApp Graph API implementation
 */
export class MetaWhatsappProvider implements IWhatsappProvider {
  name = 'META_CLOUD';

  private phoneNumberId: string;
  private accessToken: string;
  private graphApiVersion: string;

  constructor(config: {
    phoneNumberId: string;
    accessToken: string;
    graphApiVersion?: string | null;
  }) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.graphApiVersion = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
  }

  /**
   * Format phone number to clean digit string without leading plus or symbols
   */
  private formatPhoneNumber(rawPhone: string): string {
    let clean = rawPhone.replace(/[^\d]/g, '');
    if (!clean || clean.length < 7) {
      throw new Error(
        `Invalid recipient phone number: "${rawPhone}". Must contain at least 7 digits.`
      );
    }
    // Auto-prepend India country code '91' if user provided a 10-digit mobile number
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      clean = `91${clean}`;
    }
    return clean;
  }

  async sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult> {
    const formattedPhone = this.formatPhoneNumber(opts.phone);

    const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;

    // Helper for sending a payload to Meta
    const postPayload = async (payload: object) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const resData = (await response.json()) as MetaApiSendResponse;
      return { response, resData };
    };

    if (opts.useTemplate && !opts.templateName) {
      throw new Error('Template name is required when sending a template message.');
    }

    const templateComponents =
      opts.templateParams && opts.templateParams.length > 0
        ? [
            {
              type: 'body',
              parameters: opts.templateParams.map((p) => ({ type: 'text', text: p })),
            },
          ]
        : undefined;

    const templatePayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: opts.templateName!,
        language: { code: 'en' },
        ...(templateComponents && { components: templateComponents }),
      },
    };

    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: opts.message,
      },
    };

    const activePayload = opts.useTemplate ? templatePayload : textPayload;
    console.log(
      `[Meta API] POST ${url} | Recipient: "+${formattedPhone}" | Type: ${activePayload.type}`
    );

    try {
      const { response, resData } = await postPayload(activePayload);

      if (!response.ok) {
        const metaErr = resData?.error;
        let errMsg = metaErr?.message || `Meta Graph API returned HTTP status ${response.status}`;
        const errCode = metaErr?.code;

        if (errCode === 190) {
          errMsg =
            'Meta Access Token has expired or is invalid. Please regenerate a new token in the Meta Developer Dashboard and update Settings.';
        } else if (errCode === 131030) {
          errMsg = `⚠️ Meta Test Mode Restriction: "${formattedPhone}" is not in the allowed recipient list. Go to Meta Developer Dashboard → Your App → WhatsApp → API Setup → Step 2 → "To" dropdown → "Manage phone number list" → Add "+${formattedPhone}" and verify with the OTP sent to that number.`;
        } else if (errCode === 100) {
          errMsg = `Recipient phone number "${formattedPhone}" is invalid or not registered on WhatsApp. Check the number format (E.164 with country code).`;
        } else if (errCode === 130429 || errCode === 80007) {
          errMsg =
            'Meta WhatsApp API rate limit exceeded. Please wait a few minutes before retrying.';
        } else if (metaErr?.error_user_msg) {
          errMsg = metaErr.error_user_msg;
        }

        console.error(
          `[Meta API] Response Error (HTTP ${response.status}, Code ${errCode || 'unknown'}):`,
          errMsg
        );
        throw new Error(errMsg);
      }

      const metaMessageId = resData?.messages?.[0]?.id || `wamid_${Date.now()}`;
      console.log(`[Meta API] ✅ Dispatch Successful | Meta Message ID: ${metaMessageId}`);

      return {
        success: true,
        messageId: metaMessageId,
        provider: this.name,
      };
    } catch (error: unknown) {
      if (error instanceof Error) throw error;
      throw new Error('Network error or timeout while connecting to Meta WhatsApp Cloud API.');
    }
  }

  /**
   * Validate Meta credentials by making a test GET request to Graph API Phone Number endpoint
   */
  static async testConnection(config: {
    phoneNumberId: string;
    accessToken: string;
    graphApiVersion?: string | null;
  }): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    const version = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
    const url = `https://graph.facebook.com/${version}/${config.phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const resData = (await response.json()) as MetaApiTestResponse;

      if (response.ok && resData.id) {
        return {
          success: true,
          message: `Meta WhatsApp Cloud API connected successfully! Phone: ${resData.display_phone_number || resData.id} (${resData.verified_name || 'Verified'})`,
          details: {
            phoneNumberId: resData.id,
            displayPhoneNumber: resData.display_phone_number,
            verifiedName: resData.verified_name,
            qualityRating: resData.quality_rating,
          },
        };
      }

      const metaErr = resData?.error;
      let errMsg = metaErr?.message || `HTTP ${response.status} check failed.`;
      if (metaErr?.code === 190) {
        errMsg = 'Invalid or expired Meta Access Token.';
      } else if (metaErr?.code === 100) {
        errMsg = 'Invalid Phone Number ID. Check your WhatsApp Business Account dashboard.';
      }

      return {
        success: false,
        message: `Validation failed: ${errMsg}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message:
          'Failed to reach Meta Graph API. Please check your internet connection and API parameters.',
      };
    }
  }
}

import { env } from '../../config/env';

/**
 * Factory to get active WhatsApp provider for a user
 */
export class WhatsappProviderFactory {
  static async getProviderForUser(userId: string): Promise<IWhatsappProvider> {
    try {
      const config = await prisma.whatsappConfig.findUnique({ where: { userId } });

      if (
        config &&
        config.provider === 'META_CLOUD' &&
        config.phoneNumberId &&
        config.accessToken
      ) {
        let decryptedToken = '';
        try {
          decryptedToken = decrypt(config.accessToken);
        } catch {
          decryptedToken = config.accessToken;
        }

        const effectivePhoneId =
          config.phoneNumberId === '1234002809793277' && env.WHATSAPP_PHONE_NUMBER_ID
            ? env.WHATSAPP_PHONE_NUMBER_ID
            : config.phoneNumberId;

        if (decryptedToken.trim()) {
          return new MetaWhatsappProvider({
            phoneNumberId: effectivePhoneId,
            accessToken: decryptedToken.trim(),
            graphApiVersion: config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION,
          });
        }
      }

      // Fallback to environment variables if Meta Cloud is enabled in env or config is unconfigured
      if (
        (env.WHATSAPP_PROVIDER === 'META_CLOUD' || !config) &&
        env.WHATSAPP_PHONE_NUMBER_ID &&
        env.WHATSAPP_ACCESS_TOKEN
      ) {
        return new MetaWhatsappProvider({
          phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: env.WHATSAPP_ACCESS_TOKEN,
          graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION,
        });
      }
    } catch (err) {
      console.warn('[WhatsappProviderFactory] Error loading user provider config:', err);
    }

    return new MockWhatsappProvider();
  }
}
