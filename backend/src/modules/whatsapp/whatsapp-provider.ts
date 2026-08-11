import { PrismaClient } from '@prisma/client';
import { decrypt } from '../../utils/crypto';
import { env } from '../../config/env';

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
    error_subcode?: number;
    error_user_msg?: string;
    error_data?: unknown;
    fbtrace_id?: string;
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

type MetaTemplateComponent = {
  type: string;
  text?: string;
  format?: string;
};

type MetaTemplateItem = {
  name: string;
  language: string;
  status: string;
  id?: string;
  components?: MetaTemplateComponent[];
};

type MetaTemplateListResponse = {
  data?: MetaTemplateItem[];
  error?: { message?: string; code?: number };
};

/**
 * Mock WhatsApp Provider — Simulates sending with 2-4s network latency when no API credentials exist.
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

interface TemplateMeta {
  language: string;
  paramCount: number;
}

/**
 * In-memory cache: templateName -> { language, paramCount }
 * Cleared on #130001 or #132000 errors so the next attempt re-fetches.
 */
const templateMetaCache: Map<string, TemplateMeta> = new Map();

/**
 * Meta WhatsApp Cloud API Provider — Official WhatsApp Graph API implementation
 */
export class MetaWhatsappProvider implements IWhatsappProvider {
  name = 'META_CLOUD';

  private phoneNumberId: string;
  private accessToken: string;
  private graphApiVersion: string;
  private wabaId: string;

  constructor(config: {
    phoneNumberId: string;
    accessToken: string;
    graphApiVersion?: string | null;
    wabaId?: string | null;
  }) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.graphApiVersion = config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
    this.wabaId = config.wabaId || env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  }

  /**
   * Format phone number to clean digit string.
   * Auto-prepends India country code '91' if user provided a 10-digit Indian mobile number.
   */
  private formatPhoneNumber(rawPhone: string): string {
    let clean = rawPhone.replace(/[^\d]/g, '');
    if (!clean || clean.length < 7) {
      throw new Error(
        `Invalid recipient phone number: "${rawPhone}". Must contain at least 7 digits.`
      );
    }
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      clean = `91${clean}`;
    }
    return clean;
  }

  /**
   * Fetches language code and expected parameter count ({{1}}, {{2}}) for a template from Meta WABA API.
   * Cached in-process to maximize speed.
   */
  private async resolveTemplateMeta(templateName: string): Promise<TemplateMeta> {
    const cached = templateMetaCache.get(templateName);
    if (cached) {
      console.log(
        `[Meta API] Template meta (cache hit): "${templateName}" -> lang="${cached.language}", paramCount=${cached.paramCount}`
      );
      return cached;
    }

    if (!this.wabaId) {
      console.warn(
        `[Meta API] WABA ID not configured — cannot auto-fetch template info for "${templateName}". Using default lang="en_US", paramCount=1.`
      );
      return { language: 'en_US', paramCount: 1 };
    }

    const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=name,language,status,components&limit=10`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const resData = (await response.json()) as MetaTemplateListResponse;

      console.log(
        `[Meta API] Templates API response for "${templateName}": ${JSON.stringify(resData)}`
      );

      if (resData.data && resData.data.length > 0) {
        const approved = resData.data.find(
          (t) => t.name === templateName && t.status === 'APPROVED'
        );
        const anyMatch = resData.data.find((t) => t.name === templateName);
        const match = approved || anyMatch;

        if (match?.language) {
          let paramCount = 0;
          const bodyComp = match.components?.find((c) => c.type === 'BODY');
          if (bodyComp?.text) {
            const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
              const indices = matches.map((m) => parseInt(m.replace(/[^\d]/g, ''), 10));
              paramCount = Math.max(...indices, 0);
            }
          }

          console.log(
            `[Meta API] Resolved template "${templateName}" -> lang: "${match.language}", status: "${match.status}", paramCount: ${paramCount}`
          );
          const metaInfo = { language: match.language, paramCount };
          templateMetaCache.set(templateName, metaInfo);
          return metaInfo;
        }
      }

      console.warn(
        `[Meta API] Template "${templateName}" not found in WABA ${this.wabaId} — default lang="en_US", paramCount=1.`
      );
      return { language: 'en_US', paramCount: 1 };
    } catch (err) {
      console.error(`[Meta API] Failed to fetch template meta for "${templateName}":`, err);
      return { language: 'en_US', paramCount: 1 };
    }
  }

  async sendMessage(opts: WhatsappSendOptions): Promise<WhatsappSendResult> {
    const formattedPhone = this.formatPhoneNumber(opts.phone);
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;

    const postPayload = async (payload: object) => {
      const bodyStr = JSON.stringify(payload);
      console.log(`[Meta API] POST ${url}`);
      console.log(`[Meta API] Request payload: ${bodyStr}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
      const resData = (await response.json()) as MetaApiSendResponse;
      console.log(`[Meta API] Response HTTP ${response.status}: ${JSON.stringify(resData)}`);
      return { response, resData };
    };

    if (opts.useTemplate && !opts.templateName) {
      throw new Error('Template name is required when sending a template message.');
    }

    // Dynamically resolve template language code and expected parameter count from Meta WABA API
    let templateLang = 'en_US';
    let expectedParamCount = 1;
    if (opts.useTemplate && opts.templateName) {
      const metaInfo = await this.resolveTemplateMeta(opts.templateName);
      templateLang = metaInfo.language;
      expectedParamCount = metaInfo.paramCount;
    }

    // Format components to match EXACT expected parameter count in Meta template
    let templateComponents;
    if (opts.useTemplate && expectedParamCount > 0) {
      const paramsToPass: string[] = [];
      const userParams = opts.templateParams || [];

      for (let i = 0; i < expectedParamCount; i++) {
        paramsToPass.push(userParams[i] || 'there');
      }

      templateComponents = [
        {
          type: 'body',
          parameters: paramsToPass.map((p) => ({ type: 'text', text: p })),
        },
      ];
    } else {
      templateComponents = undefined;
    }

    const templatePayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: opts.templateName!,
        language: { code: templateLang },
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
      `[Meta API] Dispatching | Recipient: "+${formattedPhone}" | Type: ${activePayload.type}` +
        (opts.useTemplate
          ? ` | Template: "${opts.templateName}" | Lang: "${templateLang}" | Params: ${JSON.stringify(opts.templateParams)}`
          : '')
    );

    try {
      const { response, resData } = await postPayload(activePayload);

      if (!response.ok) {
        const metaErr = resData?.error;
        let errMsg = metaErr?.message || `Meta Graph API returned HTTP status ${response.status}`;
        const errCode = metaErr?.code;
        const errSubcode = metaErr?.error_subcode;

        console.error(
          `[Meta API] Error | Code: ${errCode} | Subcode: ${errSubcode} | fbtrace: ${metaErr?.fbtrace_id} | Msg: ${errMsg}`
        );

        if (errCode === 190) {
          errMsg =
            'Meta Access Token has expired or is invalid. Please regenerate a new token in the Meta Developer Dashboard and update Settings.';
        } else if (errCode === 130001 || errCode === 132000) {
          // Clear cache so next attempt re-fetches metadata from Meta
          if (opts.templateName) templateMetaCache.delete(opts.templateName);
          if (errCode === 132000) {
            errMsg = `(#132000) Parameter mismatch for template "${opts.templateName}". Cache cleared — please retry to sync with Meta template structure.`;
          } else {
            errMsg =
              `(#130001) Template "${opts.templateName}" not found for language "${templateLang}" in WABA "${this.wabaId}". ` +
              `Verify in Meta Business Manager: (1) Template name is exactly "${opts.templateName}". ` +
              `(2) Template status is APPROVED/Active. ` +
              `(3) WABA ID "${this.wabaId}" is linked to phone number ID "${this.phoneNumberId}".`;
          }
        } else if (errCode === 131030) {
          errMsg = `Meta Test Mode Restriction: "+${formattedPhone}" is not in the allowed recipient list. Add it in Meta Developer Dashboard -> Your App -> WhatsApp -> API Setup -> Step 2 -> "Manage phone number list".`;
        } else if (errCode === 100) {
          errMsg = `Recipient phone number "${formattedPhone}" is invalid or not registered on WhatsApp (code 100).`;
        } else if (errCode === 130429 || errCode === 80007) {
          errMsg =
            'Meta WhatsApp API rate limit exceeded. Please wait a few minutes before retrying.';
        } else if (metaErr?.error_user_msg) {
          errMsg = metaErr.error_user_msg;
        }

        throw new Error(errMsg);
      }

      const metaMessageId = resData?.messages?.[0]?.id || `wamid_${Date.now()}`;
      console.log(`[Meta API] Dispatch Successful | Meta Message ID: ${metaMessageId}`);

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

/**
 * Factory to get active WhatsApp provider for a user.
 * Passes wabaId so the provider can auto-fetch template language codes.
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
            graphApiVersion: config.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION,
            wabaId: config.businessAccountId || env.WHATSAPP_BUSINESS_ACCOUNT_ID,
          });
        }
      }

      // Fallback to environment variables if Meta Cloud is enabled in env
      if (
        (env.WHATSAPP_PROVIDER === 'META_CLOUD' || !config) &&
        env.WHATSAPP_PHONE_NUMBER_ID &&
        env.WHATSAPP_ACCESS_TOKEN
      ) {
        return new MetaWhatsappProvider({
          phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: env.WHATSAPP_ACCESS_TOKEN,
          graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION,
          wabaId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        });
      }
    } catch (err) {
      console.warn('[WhatsappProviderFactory] Error loading user provider config:', err);
    }

    return new MockWhatsappProvider();
  }
}
