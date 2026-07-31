import { api } from './api';
import { AnalyticsFilterInput, AnalyticsOverviewResponse, ApiResponse } from '@mailflow/shared';

export class AnalyticsService {
  /**
   * Fetch complete analytics overview & metrics based on filter criteria
   */
  static async getOverview(filters: AnalyticsFilterInput): Promise<AnalyticsOverviewResponse> {
    const params = new URLSearchParams();
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.status) params.append('status', filters.status);
    if (filters.leadSource) params.append('leadSource', filters.leadSource);
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get<ApiResponse<AnalyticsOverviewResponse>>(
      `/analytics/overview?${params.toString()}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch analytics metrics');
    }
    return response.data.data;
  }

  /**
   * Export CSV report download
   */
  static async downloadCsvReport(filters: AnalyticsFilterInput): Promise<void> {
    const params = new URLSearchParams();
    params.append('format', 'csv');
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);

    const response = await api.get(`/analytics/export?${params.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MailFlow_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
