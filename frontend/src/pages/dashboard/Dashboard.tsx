import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Table, type Column } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  leadsCount: number;
  emailsSent: number;
  emailsFailed: number;
  createdAt: string;
}

interface DashboardData {
  totalLeads: number;
  activeCampaigns: number;
  emailsSent: number;
  emailSuccessRate: number;
  recentCampaigns: RecentCampaign[];
  currentMonth: string;
  hasEmailData: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString();
}

function statusVariant(status: string): 'info' | 'success' | 'neutral' | 'warning' | 'error' {
  switch (status.toUpperCase()) {
    case 'SENDING':
    case 'QUEUED':
      return 'info';
    case 'COMPLETED':
    case 'SENT':
      return 'success';
    case 'PAUSED':
    case 'READY':
      return 'warning';
    case 'FAILED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'neutral';
  }
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <Card variant="elevated" padding="md" className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-[var(--surface-border)] rounded" />
        <div className="w-8 h-8 bg-[var(--surface-border)] rounded-lg" />
      </div>
      <div className="flex items-baseline justify-between">
        <div className="h-8 w-20 bg-[var(--surface-border)] rounded" />
        <div className="h-5 w-12 bg-[var(--surface-border)] rounded-full" />
      </div>
      <div className="h-3 w-32 bg-[var(--surface-border)] rounded" />
    </Card>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: DashboardData; error?: string }>(
        '/dashboard'
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to load dashboard');
      }
      setData(res.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e.response?.data?.error || e.message || 'Failed to load dashboard data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // ─── Table columns for recent campaigns ───────────────────────────────────

  const columns: Column<RecentCampaign>[] = [
    {
      key: 'name',
      header: 'Campaign Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--content-primary)]">{row.name}</p>
            <p className="text-xs text-[var(--content-tertiary)]">
              {fmt(row.leadsCount)} recipient{row.leadsCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusVariant(row.status)} dot>
          {statusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'emailsSent',
      header: 'Sent',
      align: 'right',
      render: (row) => fmt(row.emailsSent),
    },
    {
      key: 'emailsFailed',
      header: 'Failed',
      align: 'right',
      render: (row) =>
        row.emailsFailed > 0 ? (
          <span className="text-red-400 font-medium">{fmt(row.emailsFailed)}</span>
        ) : (
          <span className="text-[var(--content-tertiary)]">—</span>
        ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  // Dynamic current month from JS — never hardcoded
  const currentMonth =
    data?.currentMonth ??
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <Card
        variant="default"
        className="relative overflow-hidden border-brand-500/20 bg-gradient-to-r from-brand-950/40 via-[var(--surface-card)] to-[var(--surface-card)] p-6 md:p-8"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm">
                Active Workspace
              </Badge>
              <span className="text-xs text-[var(--content-tertiary)]">•</span>
              <span className="text-xs text-[var(--content-tertiary)]">{currentMonth}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--content-primary)] tracking-tight">
              Welcome back to MailFlow, {firstName} 👋
            </h1>
            <p className="text-sm text-[var(--content-secondary)] max-w-xl leading-relaxed">
              {loading
                ? 'Loading your campaign activity…'
                : error
                  ? 'Unable to load stats right now.'
                  : data && (data.activeCampaigns > 0 || data.emailsSent > 0)
                    ? `You have ${data.activeCampaigns} active campaign${data.activeCampaigns !== 1 ? 's' : ''} and ${fmt(data.emailsSent)} email${data.emailsSent !== 1 ? 's' : ''} sent to date.`
                    : "Here's your campaign activity. Create a campaign to get started."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Navigating to Leads');
                navigate(ROUTES.LEADS);
              }}
            >
              Import Leads
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success('Navigating to campaign builder');
                navigate(ROUTES.CAMPAIGNS);
              }}
              leftIcon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Campaign
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : error ? (
          <div className="col-span-4 p-6 rounded-xl border border-red-500/30 bg-red-500/8 text-red-300 text-sm text-center">
            ⚠️ {error} —{' '}
            <button
              onClick={() => void fetchDashboard()}
              className="underline hover:text-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Total Leads */}
            <Card variant="elevated" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
                  Total Leads
                </span>
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[var(--content-primary)]">
                  {fmt(data?.totalLeads ?? 0)}
                </span>
                {(data?.totalLeads ?? 0) === 0 && (
                  <Badge variant="neutral" size="sm">
                    None yet
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--content-tertiary)]">All leads in your account</p>
            </Card>

            {/* Active Campaigns */}
            <Card variant="elevated" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
                  Active Campaigns
                </span>
                <span className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[var(--content-primary)]">
                  {data?.activeCampaigns ?? 0}
                </span>
                {(data?.activeCampaigns ?? 0) > 0 ? (
                  <Badge variant="info" size="sm">
                    In-flight
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    None active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--content-tertiary)]">Queued, Sending, or Paused</p>
            </Card>

            {/* Emails Sent */}
            <Card variant="elevated" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
                  Emails Sent
                </span>
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[var(--content-primary)]">
                  {fmt(data?.emailsSent ?? 0)}
                </span>
                {(data?.emailsSent ?? 0) === 0 && (
                  <Badge variant="neutral" size="sm">
                    None yet
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--content-tertiary)]">
                Successfully delivered emails
              </p>
            </Card>

            {/* Success Rate */}
            <Card variant="elevated" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
                  Success Rate
                </span>
                <span className="p-2 rounded-lg bg-green-500/10 text-green-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-[var(--content-primary)]">
                  {data?.hasEmailData ? `${data.emailSuccessRate}%` : '—'}
                </span>
                {data?.hasEmailData && data.emailSuccessRate >= 90 && (
                  <Badge variant="success" size="sm">
                    Excellent
                  </Badge>
                )}
                {data?.hasEmailData && data.emailSuccessRate > 0 && data.emailSuccessRate < 90 && (
                  <Badge variant="warning" size="sm">
                    Review
                  </Badge>
                )}
                {!data?.hasEmailData && (
                  <Badge variant="neutral" size="sm">
                    No data
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--content-tertiary)]">
                {data?.hasEmailData ? 'Sent / (Sent + Failed) emails' : 'Send emails to see rate'}
              </p>
            </Card>
          </>
        )}
      </div>

      {/* ── Recent Campaigns table ───────────────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              Recent Campaigns
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void fetchDashboard()}
                disabled={loading}
              >
                🔄 Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.CAMPAIGNS)}>
                View All
              </Button>
            </div>
          </div>
        }
        padding="none"
      >
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--content-tertiary)] animate-pulse">
            Loading campaigns…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        ) : data?.recentCampaigns.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="text-4xl">📭</div>
            <p className="text-sm font-medium text-[var(--content-secondary)]">No campaigns yet</p>
            <p className="text-xs text-[var(--content-tertiary)]">
              Create your first campaign to see it here.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(ROUTES.CAMPAIGNS)}
              className="mt-2"
            >
              Create Campaign
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={data?.recentCampaigns ?? []}
            keyExtractor={(row) => row.id}
            className="border-0 rounded-none"
          />
        )}
      </Card>

      {/* ── Quick links ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 font-bold text-base">
              ✉️
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--content-primary)]">Connect Mailbox</p>
              <p className="text-xs text-[var(--content-secondary)]">
                Sync Gmail or Outlook for cold email sending
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Mailbox connection — go to Settings → SMTP')}
          >
            Connect
          </Button>
        </Card>

        <Card padding="md" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold">
              ⚡
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--content-primary)]">Analytics</p>
              <p className="text-xs text-[var(--content-secondary)]">
                View detailed delivery, open and reply metrics
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.ANALYTICS)}>
            View
          </Button>
        </Card>
      </div>
    </div>
  );
}
