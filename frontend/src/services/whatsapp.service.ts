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

  async previewTemplate(
    leadId: string,
    templateName?: string
  ): Promise<{
    leadId: string;
    leadName: string;
    companyName: string;
    phone: string;
    templateName: string;
    templateLang: string;
    variables: Record<string, string>;
    templateParams: string[];
    previewText: string;
  }> {
    const { data: envelope } = await api.post<
      ApiEnvelope<{
        leadId: string;
        leadName: string;
        companyName: string;
        phone: string;
        templateName: string;
        templateLang: string;
        variables: Record<string, string>;
        templateParams: string[];
        previewText: string;
      }>
    >('/whatsapp/preview-template', { leadId, templateName });
    return envelope.data;
  },

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

  async sendMessages(opts: {
    leadIds?: string[];
    campaignId?: string;
    message?: string;
    sendAll?: boolean;
    templateName?: string;
    templateParams?: string[];
  }): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<
      ApiEnvelope<{ count: number; message: string }> & { error?: string }
    >('/whatsapp/send', opts);

    if (!envelope.success || envelope.error) {
      throw new Error(envelope.error || envelope.message || 'Failed to queue WhatsApp message');
    }

    return envelope.data;
  },

  async getHistory(filters: WhatsappHistoryQuery = {}): Promise<PaginatedWhatsappHistoryResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedWhatsappHistoryResponse>>(
      '/whatsapp/history',
      { params: filters }
    );
    return envelope.data;
  },

  async getFailedQueue(
    filters: WhatsappHistoryQuery = {}
  ): Promise<PaginatedWhatsappFailedQueueResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedWhatsappFailedQueueResponse>>(
      '/whatsapp/failed',
      { params: filters }
    );
    return envelope.data;
  },

  async retryFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ count: number; message: string }>>(
      '/whatsapp/failed/retry',
      { jobIds }
    );
    return envelope.data;
  },

  async deleteFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ count: number; message: string }>>(
      '/whatsapp/failed',
      { data: { jobIds } }
    );
    return envelope.data;
  },

  async getStats(): Promise<WhatsappStats> {
    const { data: envelope } = await api.get<ApiEnvelope<WhatsappStats>>('/whatsapp/stats');
    return envelope.data;
  },

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

  async initConnect(): Promise<WhatsappConnectInitResponse> {
    const { data: envelope } =
      await api.post<ApiEnvelope<WhatsappConnectInitResponse>>('/whatsapp/connect');
    return envelope.data;
  },

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

  async refresh(): Promise<{ config: WhatsappConfigData }> {
    const { data: envelope } =
      await api.post<ApiEnvelope<{ config: WhatsappConfigData }>>('/whatsapp/refresh');
    if (!envelope.success) {
      throw new Error((envelope as unknown as { error?: string }).error || 'Refresh failed.');
    }
    return envelope.data;
  },

  async disconnect(): Promise<void> {
    await api.post('/whatsapp/disconnect');
  },

  async manualConnect(opts: {
    accessToken: string;
    phoneNumberId: string;
    wabaId?: string;
  }): Promise<{ config: WhatsappConfigData }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ config: WhatsappConfigData }>>(
      '/whatsapp/manual-connect',
      opts
    );
    if (!envelope.success) {
      throw new Error(
        (envelope as unknown as { error?: string }).error || 'Manual connect failed.'
      );
    }
    return envelope.data;
  },
};
