import { api } from './api';
import {
  SettingsEnvelope,
  UserProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AiConfigData,
  SaveAiConfigRequest,
  TestAiConnectionRequest,
  TestAiConnectionResponse,
  WhatsappConfigData,
  SaveWhatsappConfigRequest,
  TestWhatsappConnectionResponse,
  AppPreferencesData,
  UpdateAppPreferencesRequest,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const settingsService = {
  /**
   * Load unified workspace settings envelope
   */
  async getSettings(): Promise<SettingsEnvelope> {
    const { data: envelope } = await api.get<ApiEnvelope<SettingsEnvelope>>('/settings');
    return envelope.data;
  },

  /**
   * Update profile information
   */
  async updateProfile(req: UpdateProfileRequest): Promise<UserProfileData> {
    const { data: envelope } = await api.put<ApiEnvelope<UserProfileData>>(
      '/settings/profile',
      req
    );
    return envelope.data;
  },

  /**
   * Change user password securely
   */
  async changePassword(req: ChangePasswordRequest): Promise<{ message: string }> {
    const { data: envelope } = await api.put<ApiEnvelope<{ message: string }>>(
      '/settings/security',
      req
    );
    return envelope.data;
  },

  /**
   * Save AI Provider Configuration
   */
  async saveAiConfig(req: SaveAiConfigRequest): Promise<AiConfigData> {
    const { data: envelope } = await api.post<ApiEnvelope<AiConfigData>>('/settings/ai', req);
    return envelope.data;
  },

  /**
   * Test AI Connection & API Key
   */
  async testAiConnection(req?: TestAiConnectionRequest): Promise<TestAiConnectionResponse> {
    const { data: envelope } = await api.post<ApiEnvelope<TestAiConnectionResponse>>(
      '/settings/ai/test',
      req
    );
    return envelope.data;
  },

  /**
   * Save Meta WhatsApp Cloud API credentials
   */
  async saveWhatsappConfig(req: SaveWhatsappConfigRequest): Promise<WhatsappConfigData> {
    const { data: envelope } = await api.post<ApiEnvelope<WhatsappConfigData>>(
      '/settings/whatsapp',
      req
    );
    return envelope.data;
  },

  /**
   * Test WhatsApp Connection
   */
  async testWhatsappConnection(): Promise<TestWhatsappConnectionResponse> {
    const { data: envelope } =
      await api.post<ApiEnvelope<TestWhatsappConnectionResponse>>('/settings/whatsapp/test');
    return envelope.data;
  },

  /**
   * Save Application Preferences
   */
  async updatePreferences(req: UpdateAppPreferencesRequest): Promise<AppPreferencesData> {
    const { data: envelope } = await api.put<ApiEnvelope<AppPreferencesData>>(
      '/settings/preferences',
      req
    );
    return envelope.data;
  },
};
