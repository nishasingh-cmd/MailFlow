import { api } from './api';
import {
  Campaign,
  CampaignDetail,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignQueryFilters,
  PaginatedCampaignsResponse,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const campaignService = {
  async createCampaign(payload: CreateCampaignRequest): Promise<Campaign> {
    const { data: envelope } = await api.post<ApiEnvelope<Campaign>>('/campaigns', payload);
    return envelope.data;
  },

  async getCampaigns(filters: CampaignQueryFilters = {}): Promise<PaginatedCampaignsResponse> {
    const { data: envelope } = await api.get<ApiEnvelope<PaginatedCampaignsResponse>>(
      '/campaigns',
      { params: filters }
    );
    return envelope.data;
  },

  async getCampaignById(id: string): Promise<CampaignDetail> {
    const { data: envelope } = await api.get<ApiEnvelope<CampaignDetail>>(`/campaigns/${id}`);
    return envelope.data;
  },

  async updateCampaign(id: string, payload: UpdateCampaignRequest): Promise<Campaign> {
    const { data: envelope } = await api.patch<ApiEnvelope<Campaign>>(`/campaigns/${id}`, payload);
    return envelope.data;
  },

  async deleteCampaign(id: string): Promise<{ message: string }> {
    const { data: envelope } = await api.delete<ApiEnvelope<{ message: string }>>(
      `/campaigns/${id}`
    );
    return envelope.data;
  },

  async duplicateCampaign(id: string): Promise<Campaign> {
    const { data: envelope } = await api.post<ApiEnvelope<Campaign>>(`/campaigns/${id}/duplicate`);
    return envelope.data;
  },

  async getDatasetColumns(datasetId: string): Promise<{
    datasetId: string;
    datasetName: string;
    columns: string[];
    totalRows: number;
  }> {
    const { data: envelope } = await api.get<
      ApiEnvelope<{
        datasetId: string;
        datasetName: string;
        columns: string[];
        totalRows: number;
      }>
    >('/campaigns/dataset-columns', { params: { datasetId } });
    return envelope.data;
  },
};
