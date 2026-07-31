import { PrismaClient } from '@prisma/client';
import { decrypt } from '../../utils/crypto';

const prisma = new PrismaClient();

export interface WhatsappSendOptions {
  phone: string;
  message: string;
  userId: string;
  leadId?: string;
  campaignId?: string;
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
    console.log(
      `[MockWhatsappProvider] Simulating dispatch to ${opts.phone} (Latency: ${delayMs}ms)...`
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const cleanPhone = opts.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error(`Invalid recipient phone number format: "${opts.phone}".`);
    }

    const mockMessageId = `wa_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(
      `[MockWhatsappProvider] ✅ Message delivered successfully to ${opts.phone}. ID: ${mockMessageId}`
    );

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
    this.graphApiVersion = config.graphApiVersion || 'v20.0';
  }

  /**
   * Format phone number to clean digit string without leading plus or symbols
   */
  private formatPhoneNumber(rawPhone: string): string {
    const clean = rawPhone.replace(/[^\d]/g, '');
    if (!clean || clean.length < 7) {
      throw new Error(
        `Invalid recipient phone number: "${rawPhone}". Must contain at least 7 digits.`
      );
    }
    return clean;
  }

  async sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult> {
    const formattedPhone = this.formatPhoneNumber(opts.phone);
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: opts.message,
      },
    };

    console.log(`[MetaWhatsappProvider] Dispatching Meta Cloud message to ${formattedPhone}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = (await response.json()) as MetaApiSendResponse;

      if (!response.ok) {
        const metaErr = resData?.error;
        let errMsg = metaErr?.message || `Meta Graph API returned HTTP status ${response.status}`;
        const errCode = metaErr?.code;

        if (errCode === 190) {
          errMsg = 'Meta Access Token has expired or is invalid. Please update token in Settings.';
        } else if (errCode === 100 || errCode === 131030) {
          errMsg = `Recipient phone number "${formattedPhone}" is invalid or not registered on WhatsApp.`;
        } else if (errCode === 130429 || errCode === 80007) {
          errMsg = 'Meta WhatsApp API rate limit exceeded. Retrying shortly.';
        } else if (metaErr?.error_user_msg) {
          errMsg = metaErr.error_user_msg;
        }

        console.error(`[MetaWhatsappProvider] Error (Code ${errCode || 'unknown'}):`, errMsg);
        throw new Error(errMsg);
      }

      const metaMessageId = resData?.messages?.[0]?.id || `wamid_${Date.now()}`;
      console.log(
        `[MetaWhatsappProvider] ✅ Dispatch successful. Meta Message ID: ${metaMessageId}`
      );

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
    const version = config.graphApiVersion || 'v20.0';
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

        if (decryptedToken.trim()) {
          return new MetaWhatsappProvider({
            phoneNumberId: config.phoneNumberId,
            accessToken: decryptedToken.trim(),
            graphApiVersion: config.graphApiVersion,
          });
        }
      }
    } catch (err) {
      console.warn(
        '[WhatsappProviderFactory] Error loading user provider config, falling back to MOCK:',
        err
      );
    }

    return new MockWhatsappProvider();
  }
}
