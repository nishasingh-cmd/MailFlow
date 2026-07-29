import { api } from './api';
import { Company, ResearchProgressResponse, BulkResearchRequest } from '@mailflow/shared';

export const researchService = {
  /**
   * Research a single lead's company
   */
  async researchSingle(leadId: string): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
  }> {
    const { data } = await api.post('/research/single', { leadId });
    return data;
  },

  /**
   * Research multiple selected leads' companies
   */
  async researchBulk(leadIds: string[]): Promise<ResearchProgressResponse> {
    const payload: BulkResearchRequest = { leadIds };
    const { data } = await api.post<ResearchProgressResponse>('/research/bulk', payload);
    return data;
  },

  /**
   * Research all leads for the current user
   */
  async researchAll(): Promise<ResearchProgressResponse> {
    const { data } = await api.post<ResearchProgressResponse>('/research/all');
    return data;
  },

  /**
   * Get company + research result for a specific lead
   */
  async getResearch(leadId: string): Promise<Company | null> {
    try {
      const { data } = await api.get<Company>(`/research/lead/${leadId}`);
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Retry failed research for a lead
   */
  async retryResearch(leadId: string): Promise<{
    leadId: string;
    companyName: string;
    status: string;
    error?: string;
  }> {
    const { data } = await api.post(`/research/retry/${leadId}`);
    return data;
  },

  /**
   * Get research status for multiple leads at once
   */
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
