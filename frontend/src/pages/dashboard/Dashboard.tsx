import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Table, Avatar, type Column } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';

interface RecentCampaign {
  id: string;
  name: string;
  recipients: number;
  sent: number;
  openRate: string;
  status: 'active' | 'completed' | 'draft';
}

const RECENT_CAMPAIGNS: RecentCampaign[] = [
  {
    id: '1',
    name: 'Q1 Product Announcement',
    recipients: 4821,
    sent: 4821,
    openRate: '42.8%',
    status: 'completed',
  },
  {
    id: '2',
    name: 'SaaS Founders Cold Outreach',
    recipients: 1200,
    sent: 850,
    openRate: '38.4%',
    status: 'active',
  },
  {
    id: '3',
    name: 'Enterprise Follow-up Sequence',
    recipients: 450,
    sent: 450,
    openRate: '51.2%',
    status: 'completed',
  },
  {
    id: '4',
    name: 'Webinar Leads Nurturing',
    recipients: 890,
    sent: 0,
    openRate: '0.0%',
    status: 'draft',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [campaigns] = useState<RecentCampaign[]>(RECENT_CAMPAIGNS);

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

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
              {row.recipients.toLocaleString()} recipients
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'active' ? 'info' : row.status === 'completed' ? 'success' : 'neutral'
          }
          dot
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'sent',
      header: 'Sent',
      align: 'right',
      render: (row) => row.sent.toLocaleString(),
    },
    {
      key: 'openRate',
      header: 'Open Rate',
      align: 'right',
      render: (row) => <span className="font-medium text-brand-400">{row.openRate}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
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
              <span className="text-xs text-[var(--content-tertiary)]">July 2026</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--content-primary)] tracking-tight">
              Welcome back to MailFlow, {firstName} 👋
            </h1>
            <p className="text-sm text-[var(--content-secondary)] max-w-xl leading-relaxed">
              Your campaigns are performing 14% better than last week. 4,821 emails delivered with
              zero bounces.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Lead import modal opened');
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

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-2xl font-bold text-[var(--content-primary)]">12,480</span>
            <Badge variant="success" size="sm">
              +12.4%
            </Badge>
          </div>
          <p className="text-xs text-[var(--content-tertiary)]">Compared to last month</p>
        </Card>

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
            <span className="text-2xl font-bold text-[var(--content-primary)]">8</span>
            <Badge variant="info" size="sm">
              3 Drafts
            </Badge>
          </div>
          <p className="text-xs text-[var(--content-tertiary)]">2 sequences active right now</p>
        </Card>

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[var(--content-primary)]">84,120</span>
            <Badge variant="success" size="sm">
              +18.2%
            </Badge>
          </div>
          <p className="text-xs text-[var(--content-tertiary)]">99.4% deliverability rate</p>
        </Card>

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
            <span className="text-2xl font-bold text-[var(--content-primary)]">46.8%</span>
            <Badge variant="success" size="sm">
              +4.1%
            </Badge>
          </div>
          <p className="text-xs text-[var(--content-tertiary)]">Avg open &amp; reply rate</p>
        </Card>
      </div>

      {/* ── Recent Campaigns Table ── */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              Recent Campaigns
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.CAMPAIGNS)}>
              View All
            </Button>
          </div>
        }
        padding="none"
      >
        <Table
          columns={columns}
          data={campaigns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none"
        />
      </Card>

      {/* ── Additional Quick Help / Integration Section ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              name="Google Workspace"
              size="md"
              className="bg-red-500/20 text-red-400 font-bold"
            />
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
            onClick={() => toast.info('Mailbox connection modal coming soon')}
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
              <p className="text-sm font-semibold text-[var(--content-primary)]">Warmup Engine</p>
              <p className="text-xs text-[var(--content-secondary)]">
                Automated domain warmup is enabled and running
              </p>
            </div>
          </div>
          <Badge variant="success" dot>
            Active
          </Badge>
        </Card>
      </div>
    </div>
  );
}
