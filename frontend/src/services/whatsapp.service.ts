import { api } from './api';
import {
  GenerateWhatsappResponse,
  WhatsappDraftItem,
  WhatsappHistoryQuery,
  PaginatedWhatsappHistoryResponse,
  PaginatedWhatsappFailedQueueResponse,
  WhatsappStats,
  WhatsappConfigData,
  WhatsappCallbackRequest,
  WhatsappConnectInitResponse,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const whatsappService = {
  /**
   * Generate AI WhatsApp message for lead
   */
  async generateMessage(
    leadId: string,
    campaignObjective?: string,
    cta?: string
  ): Promise<GenerateWhatsappResponse> {
    const { data: envelope } = await api.post<ApiEnvelope<GenerateWhatsappResponse>>(
      '/whatsapp/generate',
      { leadId, campaignObjective, cta }
    );
    return envelope.data;
  },

  /**
   * Save or update WhatsApp draft
   */
  async saveDraft(
    leadId: string,
    message: string,
    campaignId?: string
  ): Promise<WhatsappDraftItem> {
    const { data: envelope } = await api.post<ApiEnvelope<WhatsappDraftItem>>('/whatsapp/draft', {
      leadId,
      campaignId,
      message,
    });
    return envelope.data;
  },

  /**
   * Enqueue WhatsApp message dispatches (Individual, Selected, All)
   */
  async sendMessages(opts: {
    leadIds?: string[];
    campaignId?: string;
    message?: string;
    sendAll?: boolean;
  }): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<
      ApiEnvelope<{ count: number; message: string }> & { error?: string }
    >('/whatsapp/send', opts);

    if (!envelope.success || envelope.error) {
      throw new Error(envelope.error || envelope.message || 'Failed to queue WhatsApp message');
    }

    return envelope.data;
  },

  /**
   * Get paginated WhatsApp history log
   */
  async getHistory(filters: WhatsappHistoryQuery = {}): Promise<PaginatedWhatsappHistoryResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedWhatsappHistoryResponse>>(
      '/whatsapp/history',
      { params: filters }
    );
    return envelope.data;
  },

  /**
   * Get failed WhatsApp queue jobs
   */
  async getFailedQueue(
    filters: WhatsappHistoryQuery = {}
  ): Promise<PaginatedWhatsappFailedQueueResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedWhatsappFailedQueueResponse>>(
      '/whatsapp/failed',
      { params: filters }
    );
    return envelope.data;
  },

  /**
   * Retry failed WhatsApp jobs
   */
  async retryFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ count: number; message: string }>>(
      '/whatsapp/failed/retry',
      { jobIds }
    );
    return envelope.data;
  },

  /**
   * Delete failed WhatsApp jobs
   */
  async deleteFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ count: number; message: string }>>(
      '/whatsapp/failed',
      { data: { jobIds } }
    );
    return envelope.data;
  },

  /**
   * Get WhatsApp statistics
   */
  async getStats(): Promise<WhatsappStats> {
    const { data: envelope } = await api.get<ApiEnvelope<WhatsappStats>>('/whatsapp/stats');
    return envelope.data;
  },

  // ─── Phase 2: Embedded Signup Onboarding ─────────────────────────────────────

  /**
   * Get current WhatsApp connection status & config
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    config: WhatsappConfigData;
    appId: string;
  }> {
    const { data: envelope } =
      await api.get<ApiEnvelope<{ connected: boolean; config: WhatsappConfigData; appId: string }>>(
        '/whatsapp/status'
      );
    return envelope.data;
  },

  /**
   * Get Meta App ID and SDK config for the Embedded Signup popup
   */
  async initConnect(): Promise<WhatsappConnectInitResponse> {
    const { data: envelope } =
      await api.post<ApiEnvelope<WhatsappConnectInitResponse>>('/whatsapp/connect');
    return envelope.data;
  },

  /**
   * Send the OAuth code received from Meta Embedded Signup to the backend
   */
  async handleCallback(req: WhatsappCallbackRequest): Promise<{ config: WhatsappConfigData }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ config: WhatsappConfigData }>>(
      '/whatsapp/callback',
      req
    );
    if (!envelope.success) {
      throw new Error((envelope as unknown as { error?: string }).error || 'Connection failed.');
    }
    return envelope.data;
  },

  /**
   * Refresh WhatsApp connection details from Meta (phone, WABA name, quality)
   */
  async refresh(): Promise<{ config: WhatsappConfigData }> {
    const { data: envelope } =
      await api.post<ApiEnvelope<{ config: WhatsappConfigData }>>('/whatsapp/refresh');
    if (!envelope.success) {
      throw new Error((envelope as unknown as { error?: string }).error || 'Refresh failed.');
    }
    return envelope.data;
  },

  /**
   * Disconnect WhatsApp Business account (preserves all history)
   */
  async disconnect(): Promise<void> {
    await api.post('/whatsapp/disconnect');
  },
};
