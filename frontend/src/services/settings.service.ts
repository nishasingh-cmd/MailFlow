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
  async getSettings(): Promise<SettingsEnvelope> {
    const { data: envelope } = await api.get<ApiEnvelope<SettingsEnvelope>>('/settings');
    return envelope.data;
  },

  async updateProfile(req: UpdateProfileRequest): Promise<UserProfileData> {
    const { data: envelope } = await api.put<ApiEnvelope<UserProfileData>>(
      '/settings/profile',
      req
    );
    return envelope.data;
  },

  async changePassword(req: ChangePasswordRequest): Promise<{ message: string }> {
    const { data: envelope } = await api.put<ApiEnvelope<{ message: string }>>(
      '/settings/security',
      req
    );
    return envelope.data;
  },

  async saveAiConfig(req: SaveAiConfigRequest): Promise<AiConfigData> {
    const { data: envelope } = await api.post<ApiEnvelope<AiConfigData>>('/settings/ai', req);
    return envelope.data;
  },

  async testAiConnection(req?: TestAiConnectionRequest): Promise<TestAiConnectionResponse> {
    const { data: envelope } = await api.post<ApiEnvelope<TestAiConnectionResponse>>(
      '/settings/ai/test',
      req
    );
    return envelope.data;
  },

  async saveWhatsappConfig(req: SaveWhatsappConfigRequest): Promise<WhatsappConfigData> {
    const { data: envelope } = await api.post<ApiEnvelope<WhatsappConfigData>>(
      '/settings/whatsapp',
      req
    );
    return envelope.data;
  },

  async testWhatsappConnection(): Promise<TestWhatsappConnectionResponse> {
    const { data: envelope } =
      await api.post<ApiEnvelope<TestWhatsappConnectionResponse>>('/settings/whatsapp/test');
    return envelope.data;
  },

  async resetWhatsappConfig(): Promise<{ provider: string; status: string; message: string }> {
    const { data: envelope } = await api.post<
      ApiEnvelope<{ provider: string; status: string; message: string }>
    >('/settings/whatsapp/reset');
    return envelope.data;
  },

  async updatePreferences(req: UpdateAppPreferencesRequest): Promise<AppPreferencesData> {
    const { data: envelope } = await api.put<ApiEnvelope<AppPreferencesData>>(
      '/settings/preferences',
      req
    );
    return envelope.data;
  },
};
