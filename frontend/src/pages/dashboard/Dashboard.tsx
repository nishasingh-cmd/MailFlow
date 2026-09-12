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
  businessName?: string | null;
  industry?: string | null;
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
      key: 'channel',
      header: 'Channel',
      render: (row) => (
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {row.channel === 'WHATSAPP'
            ? 'WhatsApp'
            : row.channel === 'EMAIL_AND_WHATSAPP'
              ? 'Multi-Channel'
              : 'Email'}
        </span>
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
        className="relative overflow-hidden border-brand-500/20 bg-gradient-to-r from-brand-500/10 via-[var(--surface-card)] to-[var(--surface-card)] dark:from-brand-950/40 p-6 md:p-8"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--content-tertiary)] font-medium">
              {data?.industry && (
                <>
                  <span className="text-[var(--content-secondary)] font-medium">
                    {data.industry}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{currentMonth}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--content-primary)] tracking-tight">
              Welcome back to MailFlow, {firstName}
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
            {error} —{' '}
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
            <Card variant="elevated" padding="md">
              <div className="flex flex-col justify-between min-h-[125px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
                    Total Leads
                  </span>
                  <span className="p-2 rounded-lg bg-[#5271ff]/10 text-[#5271ff]">
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
                  <span className="text-3xl font-extrabold tracking-tight text-[#5271ff]">
                    {fmt(data?.totalLeads ?? 0)}
                  </span>
                </div>
                <p className="text-xs text-[var(--content-tertiary)]">All leads in your account</p>
              </div>
            </Card>

            {/* Active Campaigns */}
            <Card variant="elevated" padding="md">
              <div className="flex flex-col justify-between min-h-[125px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
                    Active Campaigns
                  </span>
                  <span className="p-2 rounded-lg bg-[#5271ff]/10 text-[#5271ff]">
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
                  <span className="text-3xl font-extrabold tracking-tight text-[#5271ff]">
                    {data?.activeCampaigns ?? 0}
                  </span>
                </div>
                <p className="text-xs text-[var(--content-tertiary)]">Queued, Sending, or Paused</p>
              </div>
            </Card>

            {/* Emails Sent */}
            <Card variant="elevated" padding="md">
              <div className="flex flex-col justify-between min-h-[125px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
                    Emails Sent
                  </span>
                  <span className="p-2 rounded-lg bg-[#5271ff]/10 text-[#5271ff]">
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
                  <span className="text-3xl font-extrabold tracking-tight text-[#5271ff]">
                    {fmt(data?.emailsSent ?? 0)}
                  </span>
                </div>
                <p className="text-xs text-[var(--content-tertiary)]">
                  Successfully delivered emails
                </p>
              </div>
            </Card>

            {/* Success Rate */}
            <Card variant="elevated" padding="md">
              <div className="flex flex-col justify-between min-h-[125px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
                    Success Rate
                  </span>
                  <span className="p-2 rounded-lg bg-[#5271ff]/10 text-[#5271ff]">
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
                  <span className="text-3xl font-extrabold tracking-tight text-[#5271ff]">
                    {data?.hasEmailData ? `${data.emailSuccessRate}%` : '—'}
                  </span>
                </div>
                <p className="text-xs text-[var(--content-tertiary)]">
                  {data?.hasEmailData ? 'Sent / (Sent + Failed) emails' : 'Send emails to see rate'}
                </p>
              </div>
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
                Refresh
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
            <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mx-auto text-[var(--content-tertiary)]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--content-primary)]">
                  Connect Mailbox
                </p>
                <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                  Sync Gmail or Outlook for cold email sending
                </p>
              </div>
            </div>
            <div className="mt-4 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Mailbox connection — go to Settings → SMTP')}
              >
                Connect
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--content-primary)]">
                  WhatsApp Outreach
                </p>
                <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                  Meta Cloud API, queues & live read rates
                </p>
              </div>
            </div>
            <div className="mt-4 pt-1">
              <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.WHATSAPP)}>
                Open
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="md" className="sm:col-span-2 lg:col-span-1">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--content-primary)]">Campaigns</p>
                <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                  Monitor outreach delivery, drafts and live runs
                </p>
              </div>
            </div>
            <div className="mt-4 pt-1">
              <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CAMPAIGNS)}>
                View
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
