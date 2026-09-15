import { api } from './api';
import {
  CampaignProgress,
  DeliveryLogsQuery,
  PaginatedDeliveryLogsResponse,
  FailedQueueQuery,
  PaginatedFailedQueueResponse,
  EmailStats,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CampaignPreview {
  campaignId: string;
  campaignName: string;
  channel?: 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP';
  template: string;
  lead: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    industry?: string | null;
  };
  leads?: Array<{
    id: string;
    name: string;
    email: string;
    company?: string | null;
    industry?: string | null;
  }>;
  subject: string;
  htmlBody: string;
  whatsappPreview?: {
    templateName: string;
    templateLang?: string;
    variables?: Record<string, string>;
    templateParams?: string[];
    previewText: string;
    bodyText?: string;
  } | null;
  totalLeads: number;
}

export const deliveryService = {
  async getStats(): Promise<EmailStats> {
    const { data: envelope } = await api.get<ApiEnvelope<EmailStats>>('/delivery/stats');
    return envelope.data;
  },

  async getPreview(campaignId: string, leadId?: string): Promise<CampaignPreview> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignPreview>>(
      `/delivery/campaigns/${campaignId}/preview`,
      { params: { leadId } }
    );
    return envelope.data;
  },

  async startSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/send`
    );
    return envelope.data;
  },

  async pauseSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/pause`
    );
    return envelope.data;
  },

  async resumeSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/resume`
    );
    return envelope.data;
  },

  async cancelSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/cancel`
    );
    return envelope.data;
  },

  async getProgress(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/progress`
    );
    return envelope.data;
  },

  async getLogs(filters: DeliveryLogsQuery = {}): Promise<PaginatedDeliveryLogsResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedDeliveryLogsResponse>>(
      '/delivery/logs',
      { params: filters }
    );
    return envelope.data;
  },

  async getFailedQueue(filters: FailedQueueQuery = {}): Promise<PaginatedFailedQueueResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedFailedQueueResponse>>(
      '/delivery/failed-queue',
      { params: filters }
    );
    return envelope.data;
  },

  async retryFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ count: number; message: string }>>(
      '/delivery/failed-queue/retry',
      { jobIds }
    );
    return envelope.data;
  },

  async deleteFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ count: number; message: string }>>(
      '/delivery/failed-queue',
      { data: { jobIds } }
    );
    return envelope.data;
  },

  async sendSingleEmail(input: {
    leadId: string;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; message: string; recipientEmail: string }> {
    const { data: envelope } = await api.post<
      ApiEnvelope<{ success: boolean; message: string; recipientEmail: string }>
    >('/delivery/send-single', input);
    return envelope.data;
  },
};
