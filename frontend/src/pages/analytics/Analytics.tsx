import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Skeleton, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsFilterInput, AnalyticsOverviewResponse } from '@mailflow/shared';
import {
  AnalyticsStatCards,
  AnalyticsFilters,
  CampaignPerformanceTable,
  LeadAnalyticsSection,
  EmailAnalyticsSection,
  WhatsappAnalyticsSection,
  AnalyticsChartsSection,
  ExportReportModal,
} from '../../components/analytics';
import { ROUTES } from '../../routes/routes';

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filters, setFilters] = useState<AnalyticsFilterInput>({
    dateRange: 'last_30_days',
    campaignId: 'ALL',
    status: 'ALL',
    leadSource: 'ALL',
    industry: 'ALL',
    search: '',
  });

  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const res = await AnalyticsService.getOverview(filters);
        setData(res);
      } catch (err: unknown) {
        console.error('[AnalyticsPage] Fetch error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load analytics data';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, toast]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle auto-refresh interval when enabled
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchAnalytics(true);
      }, 15000); // Auto refresh every 15s
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, fetchAnalytics]);

  const handleExportCsv = async () => {
    try {
      await AnalyticsService.downloadCsvReport(filters);
      toast.success('Report downloaded successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    }
  };

  const totalLeadsVal = data ? Number(data.summary.totalLeads.value) || 0 : 0;
  const totalCampaignsVal = data ? Number(data.summary.totalCampaigns.value) || 0 : 0;
  const hasAnyData = data && (totalLeadsVal > 0 || totalCampaignsVal > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Analytics &amp; Reporting
          </h1>
          <p className="text-sm text-[var(--content-secondary)] font-normal">
            Real-time campaign deliverability, lead demographics, and multi-channel performance
            metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CAMPAIGNS)}>
            Manage Campaigns
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.LEADS)}>
            Manage Leads
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onRefresh={() => fetchAnalytics(true)}
        onExportClick={() => setExportModalOpen(true)}
        campaignOptions={data?.filterOptions.campaigns || []}
        industryOptions={data?.filterOptions.industries || []}
        isRefreshing={refreshing}
        autoRefreshEnabled={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />

      {/* ── Loading Skeleton ── */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} padding="md" className="space-y-3">
                <Skeleton variant="text" lines={3} />
              </Card>
            ))}
          </div>
          <Card padding="md">
            <Skeleton variant="rect" className="w-full h-64" />
          </Card>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && !data && (
        <Card variant="default">
          <EmptyState
            title="Unable to load analytics"
            description={error}
            action={{
              label: 'Retry Fetching',
              onClick: () => fetchAnalytics(),
            }}
          />
        </Card>
      )}

      {/* ── Empty State when 0 leads & 0 campaigns exist ── */}
      {!loading && data && !hasAnyData && (
        <Card variant="default">
          <EmptyState
            title="No Analytics Data Yet"
            description="Create your first email/WhatsApp campaign or import leads to start generating real-time performance insights."
            action={{
              label: 'Import Leads',
              onClick: () => navigate(ROUTES.LEADS),
            }}
          />
        </Card>
      )}

      {/* ── Main Analytics Dashboard Content ── */}
      {!loading && data && hasAnyData && (
        <div className="space-y-6">
          {/* 1. Summary Stat Cards (10 Cards) */}
          <AnalyticsStatCards summary={data.summary} />

          {/* 2. Charts Section */}
          <AnalyticsChartsSection charts={data.charts} />

          {/* 3. Campaign Performance Section */}
          <CampaignPerformanceTable campaigns={data.campaignPerformance} />

          {/* 4. Lead Analytics Section */}
          <LeadAnalyticsSection analytics={data.leadAnalytics} />

          {/* 5. Channel Analytics Sections (Email & WhatsApp) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmailAnalyticsSection analytics={data.emailAnalytics} />
            <WhatsappAnalyticsSection analytics={data.whatsappAnalytics} />
          </div>
        </div>
      )}

      {/* ── Export Report Modal ── */}
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        analyticsData={data}
        filters={filters}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
}
