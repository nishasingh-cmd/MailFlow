import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../../utils/crypto';
import { env } from '../../config/env';
import { MetaWhatsappProvider } from '../whatsapp/whatsapp-provider';

const prisma = new PrismaClient();

type WhatsappConfigDb = {
  upsert: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
};

export class SettingsService {
  /**
   * Load unified workspace settings envelope
   */
  static async getSettingsEnvelope(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        companyName: true,
        jobTitle: true,
        timeZone: true,
      },
    });

    if (!user) throw new Error('USER_NOT_FOUND');

    const [smtp, ai, wa, prefs] = await Promise.all([
      prisma.smtpConfig.findUnique({ where: { userId } }),
      prisma.aiConfig.findUnique({ where: { userId } }),
      prisma.whatsappConfig.findUnique({ where: { userId } }),
      prisma.appPreferences.findUnique({ where: { userId } }),
    ]);

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      companyName: user.companyName,
      jobTitle: user.jobTitle,
      timeZone: user.timeZone || 'UTC',
    };

    const smtpStatus = smtp ? 'CONNECTED' : 'DISCONNECTED';

    const aiConfig = {
      id: ai?.id,
      provider: (ai?.provider || 'OPENAI') as 'OPENAI' | 'GEMINI',
      hasApiKey: Boolean(ai?.apiKey || env.GEMINI_API_KEY),
      model: ai?.model || 'gpt-4o-mini',
      temperature: ai?.temperature ?? 0.7,
      maxTokens: ai?.maxTokens ?? 1000,
      status: (ai?.status || (env.GEMINI_API_KEY ? 'CONNECTED' : 'DISCONNECTED')) as
        'CONNECTED' | 'DISCONNECTED' | 'INVALID_KEY' | 'FAILED',
      lastTestedAt: ai?.lastTestedAt?.toISOString() || null,
    };

    const waAny = wa as Record<string, unknown> | null;
    const whatsappConfig = {
      id: wa?.id,
      provider: (wa?.provider || 'MOCK') as 'MOCK' | 'META_CLOUD',
      businessAccountId: wa?.businessAccountId || null,
      businessName: (waAny?.businessName as string | null) ?? null,
      phoneNumberId: wa?.phoneNumberId || null,
      displayPhone: (waAny?.displayPhone as string | null) ?? null,
      hasAccessToken: Boolean(wa?.accessToken),
      webhookVerifyToken: (waAny?.webhookVerifyToken as string) || 'mailflow_verify_token',
      hasAppSecret: Boolean(waAny?.appSecret),
      graphApiVersion:
        (waAny?.graphApiVersion as string) || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
      webhookUrl: wa?.webhookUrl || `https://api.mailflow.io/v1/webhooks/whatsapp/${userId}`,
      status: (wa?.status || 'MOCK_ACTIVE') as
        'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED',
      errorMessage: (waAny?.errorMessage as string) || null,
      lastTestedAt: wa?.lastTestedAt?.toISOString() || null,
      connectedAt: (waAny?.connectedAt as Date | null)?.toISOString() ?? null,
    };

    const preferences = {
      theme: (prefs?.theme || 'dark') as 'dark' | 'light' | 'system',
      language: prefs?.language || 'en',
      timezone: prefs?.timezone || user.timeZone || 'UTC',
      defaultDashboard: prefs?.defaultDashboard || 'overview',
      emailSignature: prefs?.emailSignature || null,
      defaultAiTone: prefs?.defaultAiTone || 'Professional',
      autoSaveDrafts: prefs?.autoSaveDrafts ?? true,
      defaultCampaignType: prefs?.defaultCampaignType || 'EMAIL',
    };

    const integrations = [
      {
        id: 'openai',
        name: 'AI Engine (Gemini / OpenAI)',
        category: 'AI' as const,
        description: 'Personalize cold emails and WhatsApp messages using advanced LLMs.',
        iconName: 'sparkles',
        status: (aiConfig.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED') as
          'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION',
        lastTestedAt: aiConfig.lastTestedAt,
      },
      {
        id: 'gmail-smtp',
        name: 'Gmail / Google Workspace SMTP',
        category: 'EMAIL' as const,
        description: 'Send high-deliverability cold emails through Gmail App Password SMTP.',
        iconName: 'mail',
        status: (smtp?.provider === 'GMAIL' ? 'CONNECTED' : 'DISCONNECTED') as
          'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION',
        lastTestedAt: smtp?.updatedAt.toISOString() || null,
      },
      {
        id: 'outlook-smtp',
        name: 'Outlook / Office 365 SMTP',
        category: 'EMAIL' as const,
        description: 'Connect enterprise Microsoft 365 email accounts.',
        iconName: 'mail',
        status: (smtp?.provider === 'OUTLOOK' ? 'CONNECTED' : 'DISCONNECTED') as
          'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION',
        lastTestedAt: smtp?.updatedAt.toISOString() || null,
      },
      {
        id: 'resend',
        name: 'Resend Email API',
        category: 'EMAIL' as const,
        description: 'Transactional & marketing email infrastructure (Placeholder API).',
        iconName: 'send',
        status: 'DISCONNECTED' as 'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION',
        lastTestedAt: null,
      },
      {
        id: 'whatsapp-cloud',
        name: 'WhatsApp Meta Cloud API',
        category: 'WHATSAPP' as const,
        description:
          'Direct Meta WhatsApp Business API integration (Mock active when unconfigured).',
        iconName: 'whatsapp',
        status: (whatsappConfig.status === 'CONNECTED' ? 'CONNECTED' : 'MOCK_ACTIVE') as
          'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION',
        lastTestedAt: whatsappConfig.lastTestedAt,
      },
    ];

    return {
      profile,
      smtpStatus,
      aiConfig,
      whatsappConfig,
      preferences,
      integrations,
    };
  }

  /**
   * Update User Profile
   */
  static async updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      avatar?: string | null;
      companyName?: string | null;
      jobTitle?: string | null;
      timeZone?: string | null;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        companyName: true,
        jobTitle: true,
        timeZone: true,
      },
    });

    return user;
  }

  /**
   * Change Password securely with current password validation
   */
  static async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string; confirmPassword: string }
  ) {
    if (!input.currentPassword || !input.newPassword) {
      throw new Error('Current password and new password are required.');
    }

    if (input.newPassword !== input.confirmPassword) {
      throw new Error('New password and confirmation password do not match.');
    }

    if (input.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(input.currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Incorrect current password.');
    }

    const newHashedPassword = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { success: true, message: 'Password updated successfully.' };
  }

  /**
   * Save AI Integration Config
   */
  static async saveAiConfig(
    userId: string,
    input: {
      provider: 'OPENAI' | 'GEMINI';
      apiKey?: string;
      model: string;
      temperature: number;
      maxTokens: number;
    }
  ) {
    const existing = await prisma.aiConfig.findUnique({ where: { userId } });

    let encryptedKey = existing?.apiKey || '';
    if (input.apiKey && input.apiKey.trim()) {
      encryptedKey = encrypt(input.apiKey.trim());
    }

    const status = encryptedKey || env.GEMINI_API_KEY ? 'CONNECTED' : 'DISCONNECTED';

    const ai = await prisma.aiConfig.upsert({
      where: { userId },
      create: {
        userId,
        provider: input.provider,
        apiKey: encryptedKey,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        status,
      },
      update: {
        provider: input.provider,
        apiKey: encryptedKey,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        status,
      },
    });

    return {
      provider: ai.provider,
      hasApiKey: Boolean(ai.apiKey || env.GEMINI_API_KEY),
      model: ai.model,
      temperature: ai.temperature,
      maxTokens: ai.maxTokens,
      status: ai.status,
    };
  }

  /**
   * Test AI Connection
   */
  static async testAiConnection(
    userId: string,
    input?: { provider?: 'OPENAI' | 'GEMINI'; apiKey?: string }
  ) {
    const existing = await prisma.aiConfig.findUnique({ where: { userId } });

    let rawKey = input?.apiKey;
    if (!rawKey && existing?.apiKey) {
      try {
        rawKey = decrypt(existing.apiKey);
      } catch {
        rawKey = undefined;
      }
    }

    if (!rawKey && env.GEMINI_API_KEY) {
      rawKey = env.GEMINI_API_KEY;
    }

    if (!rawKey) {
      return {
        success: false,
        message: 'No API Key found. Please enter an API key to test connection.',
        status: 'INVALID_KEY',
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${rawKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK.' }] }],
        }),
      });

      const now = new Date();

      if (res.ok) {
        await prisma.aiConfig.upsert({
          where: { userId },
          create: { userId, apiKey: encrypt(rawKey), status: 'CONNECTED', lastTestedAt: now },
          update: { status: 'CONNECTED', lastTestedAt: now },
        });

        return {
          success: true,
          message: 'AI Provider connection test successful! API Key validated.',
          status: 'CONNECTED',
          testedModel: 'gemini-1.5-flash',
        };
      } else {
        await prisma.aiConfig.updateMany({
          where: { userId },
          data: { status: 'INVALID_KEY', lastTestedAt: now },
        });

        return {
          success: false,
          message: `API Key validation failed (HTTP ${res.status}). Please check key permissions.`,
          status: 'INVALID_KEY',
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: 'AI Connection failed: Network error or timeout.',
        status: 'FAILED',
      };
    }
  }

  /**
   * Save WhatsApp Business Config
   */
  static async saveWhatsappConfig(
    userId: string,
    input: {
      provider: 'MOCK' | 'META_CLOUD';
      businessAccountId?: string;
      phoneNumberId?: string;
      accessToken?: string;
      webhookVerifyToken?: string;
      appSecret?: string;
      graphApiVersion?: string;
    }
  ) {
    const existing = await prisma.whatsappConfig.findUnique({ where: { userId } });
    const existingAny = existing as Record<string, unknown> | null;

    let encryptedToken = existing?.accessToken || null;
    if (input.accessToken && input.accessToken.trim()) {
      encryptedToken = encrypt(input.accessToken.trim());
    }

    let encryptedSecret = (existingAny?.appSecret as string) || null;
    if (input.appSecret && input.appSecret.trim()) {
      encryptedSecret = encrypt(input.appSecret.trim());
    }

    const provider = input.provider || 'MOCK';
    const status =
      provider === 'META_CLOUD' && encryptedToken && input.phoneNumberId
        ? 'CONNECTED'
        : provider === 'META_CLOUD'
          ? 'DISCONNECTED'
          : 'MOCK_ACTIVE';

    const waDb = prisma.whatsappConfig as unknown as WhatsappConfigDb;
    const wa = (await waDb.upsert({
      where: { userId },
      create: {
        userId,
        provider,
        businessAccountId: input.businessAccountId || null,
        phoneNumberId: input.phoneNumberId || null,
        accessToken: encryptedToken,
        webhookVerifyToken: input.webhookVerifyToken || 'mailflow_verify_token',
        appSecret: encryptedSecret,
        graphApiVersion: input.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        webhookUrl: `https://api.mailflow.io/v1/webhooks/whatsapp/${userId}`,
        status,
      },
      update: {
        provider,
        businessAccountId: input.businessAccountId || null,
        phoneNumberId: input.phoneNumberId || null,
        ...(input.accessToken ? { accessToken: encryptedToken } : {}),
        ...(input.webhookVerifyToken ? { webhookVerifyToken: input.webhookVerifyToken } : {}),
        ...(input.appSecret ? { appSecret: encryptedSecret } : {}),
        graphApiVersion: input.graphApiVersion || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        status,
      },
    })) as Record<string, unknown>;

    return {
      provider: wa.provider as string,
      businessAccountId: wa.businessAccountId as string | null,
      phoneNumberId: wa.phoneNumberId as string | null,
      hasAccessToken: Boolean(wa.accessToken),
      webhookVerifyToken: (wa.webhookVerifyToken as string) || 'mailflow_verify_token',
      hasAppSecret: Boolean(wa.appSecret),
      graphApiVersion: (wa.graphApiVersion as string) || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
      webhookUrl: wa.webhookUrl as string,
      status: wa.status as string,
      lastTestedAt: wa.lastTestedAt ? new Date(wa.lastTestedAt as string).toISOString() : null,
    };
  }

  /**
   * Test Meta WhatsApp Cloud API Connection
   */
  static async testWhatsappConnection(userId: string) {
    const wa = await prisma.whatsappConfig.findUnique({ where: { userId } });
    const waAny = wa as Record<string, unknown> | null;
    const now = new Date();

    if (!wa || wa.provider === 'MOCK' || !wa.accessToken || !wa.phoneNumberId) {
      const waDb = prisma.whatsappConfig as unknown as WhatsappConfigDb;
      await waDb.upsert({
        where: { userId },
        create: { userId, provider: 'MOCK', status: 'MOCK_ACTIVE', lastTestedAt: now },
        update: { status: 'MOCK_ACTIVE', lastTestedAt: now },
      });

      return {
        success: true,
        message: 'Mock WhatsApp Provider is active & ready for instant testing.',
        status: 'MOCK_ACTIVE',
      };
    }

    let rawToken = wa.accessToken;
    try {
      rawToken = decrypt(wa.accessToken);
    } catch {
      rawToken = wa.accessToken;
    }

    const testRes = await MetaWhatsappProvider.testConnection({
      phoneNumberId: wa.phoneNumberId,
      accessToken: rawToken,
      graphApiVersion:
        (waAny?.graphApiVersion as string) || env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
    });

    const newStatus = testRes.success ? 'CONNECTED' : 'FAILED';

    const waDb = prisma.whatsappConfig as unknown as WhatsappConfigDb;
    await waDb.update({
      where: { userId },
      data: {
        status: newStatus,
        lastTestedAt: now,
        errorMessage: testRes.success ? null : testRes.message,
      },
    });

    return {
      success: testRes.success,
      message: testRes.message,
      status: newStatus,
      details: testRes.details,
    };
  }

  /**
   * Reset WhatsApp Configuration to Mock Mode
   */
  static async resetWhatsappConfig(userId: string) {
    const now = new Date();
    const waDb = prisma.whatsappConfig as unknown as WhatsappConfigDb;
    await waDb.upsert({
      where: { userId },

      create: {
        userId,
        provider: 'MOCK',
        status: 'MOCK_ACTIVE',
        businessAccountId: null,
        phoneNumberId: null,
        accessToken: null,
        webhookVerifyToken: 'mailflow_verify_token',
        appSecret: null,
        graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        lastTestedAt: now,
      },
      update: {
        provider: 'MOCK',
        status: 'MOCK_ACTIVE',
        businessAccountId: null,
        phoneNumberId: null,
        accessToken: null,
        appSecret: null,
        lastTestedAt: now,
        errorMessage: null,
      },
    });

    return {
      provider: 'MOCK' as const,
      status: 'MOCK_ACTIVE' as const,
      message: 'WhatsApp integration reset to Mock Provider mode.',
    };
  }

  /**
   * Save Application Preferences
   */
  static async updatePreferences(
    userId: string,
    input: {
      theme?: string;
      language?: string;
      timezone?: string;
      defaultDashboard?: string;
      emailSignature?: string | null;
      defaultAiTone?: string;
      autoSaveDrafts?: boolean;
      defaultCampaignType?: string;
    }
  ) {
    const prefs = await prisma.appPreferences.upsert({
      where: { userId },
      create: {
        userId,
        theme: input.theme || 'dark',
        language: input.language || 'en',
        timezone: input.timezone || 'UTC',
        defaultDashboard: input.defaultDashboard || 'overview',
        emailSignature: input.emailSignature || null,
        defaultAiTone: input.defaultAiTone || 'Professional',
        autoSaveDrafts: input.autoSaveDrafts ?? true,
        defaultCampaignType: input.defaultCampaignType || 'EMAIL',
      },
      update: {
        ...(input.theme ? { theme: input.theme } : {}),
        ...(input.language ? { language: input.language } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.defaultDashboard ? { defaultDashboard: input.defaultDashboard } : {}),
        ...(input.emailSignature !== undefined ? { emailSignature: input.emailSignature } : {}),
        ...(input.defaultAiTone ? { defaultAiTone: input.defaultAiTone } : {}),
        ...(input.autoSaveDrafts !== undefined ? { autoSaveDrafts: input.autoSaveDrafts } : {}),
        ...(input.defaultCampaignType ? { defaultCampaignType: input.defaultCampaignType } : {}),
      },
    });

    return prefs;
  }
}
