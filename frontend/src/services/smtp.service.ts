import { api } from './api';
import { SmtpConfig, SaveSmtpRequest, TestSmtpRequest, TestSmtpResponse } from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const smtpService = {
  /**
   * Get current user's SMTP configuration
   */
  async getConfig(): Promise<SmtpConfig | null> {
    const { data: envelope } = await api.get<ApiEnvelope<SmtpConfig | null>>('/smtp');
    return envelope.data ?? null;
  },

  /**
   * Save or update user SMTP configuration
   */
  async saveConfig(payload: SaveSmtpRequest): Promise<SmtpConfig> {
    const { data: envelope } = await api.post<ApiEnvelope<SmtpConfig>>('/smtp', payload);
    return envelope.data;
  },

  /**
   * Test SMTP credentials
   */
  async testConnection(payload: TestSmtpRequest): Promise<TestSmtpResponse> {
    const { data: envelope } = await api.post<ApiEnvelope<TestSmtpResponse>>('/smtp/test', payload);
    return envelope.data;
  },
};
