/**
 * MailFlow — Campaign Management Frontend Service
 * Phase 8: Campaign Management
 */
import { api } from './api';
import {
  Campaign,
  CampaignDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignQueryFilters,
  PaginatedCampaignsResponse,
} from '@mailflow/shared';

// Backend wraps responses as { success: boolean; data: T; message?: string }
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const campaignService = {
  /**
   * Create a new campaign
   */
  async createCampaign(payload: CreateCampaignRequest): Promise<Campaign> {
    const { data: envelope } = await api.post<ApiEnvelope<Campaign>>('/campaigns', payload);
    return envelope.data;
  },

  /**
   * Get paginated campaigns with filters
   */
  async getCampaigns(filters: CampaignQueryFilters = {}): Promise<PaginatedCampaignsResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedCampaignsResponse>>(
      '/campaigns',
      { params: filters }
    );
    return envelope.data;
  },

  /**
   * Get single campaign with full lead details
   */
  async getCampaignById(id: string): Promise<CampaignDetail> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignDetail>>(`/campaigns/${id}`);
    return envelope.data;
  },

  /**
   * Update campaign fields (partial)
   */
  async updateCampaign(id: string, payload: UpdateCampaignRequest): Promise<Campaign> {
    const { data: envelope } = await api.patch<ApiEnvelope<Campaign>>(`/campaigns/${id}`, payload);
    return envelope.data;
  },

  /**
   * Delete a campaign (never deletes leads)
   */
  async deleteCampaign(id: string): Promise<{ message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ message: string }>>(
      `/campaigns/${id}`
    );
    return envelope.data;
  },

  /**
   * Duplicate a campaign — creates a copy with "(Copy)" suffix and DRAFT status
   */
  async duplicateCampaign(id: string): Promise<Campaign> {
    const { data: envelope } = await api.post<ApiEnvelope<Campaign>>(`/campaigns/${id}/duplicate`);
    return envelope.data;
  },
};
