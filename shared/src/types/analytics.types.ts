/**
 * MailFlow — Analytics & Reporting Shared Type Definitions
 * Phase 11: Analytics & Reporting
 */

export type DateRangePreset = 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export interface AnalyticsFilterInput {
  dateRange?: DateRangePreset;
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  status?: string;
  leadSource?: string; // 'ALL' | 'IMPORTED' | 'MANUAL'
  industry?: string;
  search?: string;
}

export interface StatTrend {
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
  label: string;
}

export interface SummaryStatCard {
  title: string;
  value: number | string;
  trend: StatTrend;
  icon: string;
}

export interface AnalyticsSummary {
  totalLeads: SummaryStatCard;
  totalCampaigns: SummaryStatCard;
  emailsSent: SummaryStatCard;
  emailsPending: SummaryStatCard;
  emailsFailed: SummaryStatCard;
  whatsappSent: SummaryStatCard;
  whatsappPending: SummaryStatCard;
  whatsappFailed: SummaryStatCard;
  openRate: SummaryStatCard;
  replyRate: SummaryStatCard;
}

export interface CampaignPerformanceItem {
  id: string;
  name: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP';
  status: string;
  createdAt: string;
  emailsSent: number;
  whatsappSent: number;
  pending: number;
  failed: number;
  openRate: number; // Percentage (0-100)
  replyRate: number; // Percentage (0-100)
  performanceScore: number; // Scaled metric for sorting
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface LeadAnalytics {
  totalLeads: number;
  importedLeads: number;
  manualLeads: number;
  duplicateLeads: number;
  industryDistribution: DistributionItem[];
  companySizeDistribution: DistributionItem[];
  topIndustries: Array<{ industry: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

export interface EmailAnalytics {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  retryCount: number;
  successRate: number; // 0 - 100
  avgDeliveryTimeSeconds: number;
}

export interface WhatsappAnalytics {
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  cancelled: number;
  deliveryRate: number;
  readRate: number;
  failedRate: number;
  mockProviderStatus: string;
  futureProviderStatus: string;
}

export interface TimeSeriesPoint {
  [key: string]: string | number;
  date: string;
  emailsSent: number;
  whatsappSent: number;
  failed: number;
  total: number;
}

export interface AnalyticsChartData {
  activityTimeline: TimeSeriesPoint[];
  emailStatusDistribution: DistributionItem[];
  whatsappStatusDistribution: DistributionItem[];
  campaignPerformanceChart: Array<{
    name: string;
    sent: number;
    openRate: number;
    replyRate: number;
  }>;
  leadSourceDistribution: DistributionItem[];
  industryDistributionChart: DistributionItem[];
}

export interface AnalyticsOverviewResponse {
  summary: AnalyticsSummary;
  campaignPerformance: CampaignPerformanceItem[];
  leadAnalytics: LeadAnalytics;
  emailAnalytics: EmailAnalytics;
  whatsappAnalytics: WhatsappAnalytics;
  charts: AnalyticsChartData;
  filterOptions: {
    campaigns: Array<{ id: string; name: string }>;
    industries: string[];
  };
}
