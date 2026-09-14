import { api } from './api';
import {
  ResearchProgressResponse,
  BulkResearchRequest,
  LeadResearchResult,
} from '@mailflow/shared';

export const researchService = {
  async researchSingle(leadId: string): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
  }> {
    const { data } = await api.post('/research/single', { leadId });
    return data;
  },

  async researchBulk(leadIds: string[]): Promise<ResearchProgressResponse> {
    const payload: BulkResearchRequest = { leadIds };
    const { data } = await api.post<ResearchProgressResponse>('/research/bulk', payload);
    return data;
  },

  async researchAll(): Promise<ResearchProgressResponse> {
    const { data } = await api.post<ResearchProgressResponse>('/research/all');
    return data;
  },

  async getResearch(leadId: string): Promise<LeadResearchResult | null> {
    try {
      const { data } = await api.get<LeadResearchResult>(`/research/lead/${leadId}`);
      return data;
    } catch {
      return null;
    }
  },

  async retryResearch(leadId: string): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
  }> {
    const { data } = await api.post(`/research/retry/${leadId}`);
    return data;
  },

  async getBulkStatus(leadIds: string[]): Promise<
    Array<{
      leadId: string;
      companyId: string | null;
      researchStatus: string | null;
      lastResearched: string | null;
    }>
  > {
    const { data } = await api.post('/research/status', { leadIds });
    return data;
  },
};
