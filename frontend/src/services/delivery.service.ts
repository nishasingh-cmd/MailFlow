import { api } from './api';
import {
  CampaignProgress,
  DeliveryLogsQuery,
  PaginatedDeliveryLogsResponse,
  FailedQueueQuery,
  PaginatedFailedQueueResponse,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CampaignPreview {
  campaignId: string;
  campaignName: string;
  template: string;
  lead: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    industry?: string | null;
  };
  subject: string;
  htmlBody: string;
  totalLeads: number;
}

export const deliveryService = {
  /**
   * Get preview of personalized email for campaign
   */
  async getPreview(campaignId: string, leadId?: string): Promise<CampaignPreview> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignPreview>>(
      `/delivery/campaigns/${campaignId}/preview`,
      { params: { leadId } }
    );
    return envelope.data;
  },

  /**
   * Start sending campaign
   */
  async startSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/send`
    );
    return envelope.data;
  },

  /**
   * Pause campaign sending
   */
  async pauseSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/pause`
    );
    return envelope.data;
  },

  /**
   * Resume campaign sending
   */
  async resumeSending(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.post<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/resume`
    );
    return envelope.data;
  },

  /**
   * Get campaign progress
   */
  async getProgress(campaignId: string): Promise<CampaignProgress> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignProgress>>(
      `/delivery/campaigns/${campaignId}/progress`
    );
    return envelope.data;
  },

  /**
   * Get paginated delivery logs
   */
  async getLogs(filters: DeliveryLogsQuery = {}): Promise<PaginatedDeliveryLogsResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedDeliveryLogsResponse>>(
      '/delivery/logs',
      { params: filters }
    );
    return envelope.data;
  },

  /**
   * Get paginated failed queue
   */
  async getFailedQueue(filters: FailedQueueQuery = {}): Promise<PaginatedFailedQueueResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedFailedQueueResponse>>(
      '/delivery/failed-queue',
      { params: filters }
    );
    return envelope.data;
  },

  /**
   * Retry failed jobs (selected or all)
   */
  async retryFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.post<ApiEnvelope<{ count: number; message: string }>>(
      '/delivery/failed-queue/retry',
      { jobIds }
    );
    return envelope.data;
  },

  /**
   * Delete failed jobs (selected or all)
   */
  async deleteFailedJobs(jobIds?: string[]): Promise<{ count: number; message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ count: number; message: string }>>(
      '/delivery/failed-queue',
      { data: { jobIds } }
    );
    return envelope.data;
  },
};
