/**
 * MailFlow — Shared Types for Phase 12: Settings & Integrations
 */

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timeZone?: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatar?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  timeZone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AiConfigData {
  id?: string;
  provider: 'OPENAI' | 'GEMINI';
  hasApiKey: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  status: 'CONNECTED' | 'DISCONNECTED' | 'INVALID_KEY' | 'FAILED';
  lastTestedAt?: string | null;
}

export interface SaveAiConfigRequest {
  provider: 'OPENAI' | 'GEMINI';
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface TestAiConnectionRequest {
  provider: 'OPENAI' | 'GEMINI';
  apiKey?: string;
  model?: string;
}

export interface TestAiConnectionResponse {
  success: boolean;
  message: string;
  status: 'CONNECTED' | 'INVALID_KEY' | 'FAILED';
  testedModel?: string;
}

export interface WhatsappConfigData {
  id?: string;
  provider: 'MOCK' | 'META_CLOUD';
  businessAccountId?: string | null;
  phoneNumberId?: string | null;
  hasAccessToken: boolean;
  webhookUrl?: string | null;
  status: 'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  lastTestedAt?: string | null;
}

export interface SaveWhatsappConfigRequest {
  provider: 'MOCK' | 'META_CLOUD';
  businessAccountId?: string;
  phoneNumberId?: string;
  accessToken?: string;
}

export interface TestWhatsappConnectionResponse {
  success: boolean;
  message: string;
  status: 'MOCK_ACTIVE' | 'CONNECTED' | 'FAILED';
}

export interface AppPreferencesData {
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
  defaultDashboard: string;
  emailSignature?: string | null;
  defaultAiTone: string;
  autoSaveDrafts: boolean;
  defaultCampaignType: string;
}

export interface UpdateAppPreferencesRequest {
  theme?: 'dark' | 'light' | 'system';
  language?: string;
  timezone?: string;
  defaultDashboard?: string;
  emailSignature?: string | null;
  defaultAiTone?: string;
  autoSaveDrafts?: boolean;
  defaultCampaignType?: string;
}

export interface IntegrationCardData {
  id: string;
  name: string;
  category: 'AI' | 'EMAIL' | 'WHATSAPP';
  description: string;
  iconName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'MOCK_ACTIVE' | 'NEEDS_ATTENTION';
  lastTestedAt?: string | null;
}

export interface SettingsEnvelope {
  profile: UserProfileData;
  smtpStatus: 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  aiConfig: AiConfigData;
  whatsappConfig: WhatsappConfigData;
  preferences: AppPreferencesData;
  integrations: IntegrationCardData[];
}
