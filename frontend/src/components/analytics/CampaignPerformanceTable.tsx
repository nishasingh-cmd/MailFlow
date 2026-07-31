import React, { useState, useMemo } from 'react';
import { Card, Table, Badge, type Column, Select } from '../ui';
import { CampaignPerformanceItem } from '@mailflow/shared';

interface CampaignPerformanceTableProps {
  campaigns: CampaignPerformanceItem[];
}

type SortField = 'createdAt' | 'performanceScore' | 'openRate' | 'replyRate';
type SortDirection = 'asc' | 'desc';

export const CampaignPerformanceTable: React.FC<CampaignPerformanceTableProps> = ({
  campaigns,
}) => {
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      let valA: string | number = a[sortBy];
      let valB: string | number = b[sortBy];

      if (sortBy === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [campaigns, sortBy, sortOrder]);

  const columns: Column<CampaignPerformanceItem>[] = [
    {
      key: 'name',
      header: 'Campaign Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
            {row.channel === 'WHATSAPP'
              ? 'WA'
              : row.channel === 'EMAIL_AND_WHATSAPP'
                ? 'ALL'
                : 'EM'}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--content-primary)]">{row.name}</p>
            <p className="text-xs text-[var(--content-tertiary)]">
              Created {new Date(row.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (row) => (
        <Badge
          variant={
            row.channel === 'WHATSAPP'
              ? 'success'
              : row.channel === 'EMAIL_AND_WHATSAPP'
                ? 'info'
                : 'brand'
          }
          size="sm"
        >
          {row.channel.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let variant: 'success' | 'info' | 'warning' | 'error' | 'neutral' = 'neutral';
        if (['COMPLETED', 'READY', 'SENT'].includes(row.status)) variant = 'success';
        else if (['SENDING', 'QUEUED'].includes(row.status)) variant = 'info';
        else if (['PAUSED'].includes(row.status)) variant = 'warning';
        else if (['FAILED', 'CANCELLED'].includes(row.status)) variant = 'error';

        return (
          <Badge variant={variant} dot>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: 'emailsSent',
      header: 'Emails Sent',
      align: 'right',
      render: (row) => row.emailsSent.toLocaleString(),
    },
    {
      key: 'whatsappSent',
      header: 'WhatsApp Sent',
      align: 'right',
      render: (row) => row.whatsappSent.toLocaleString(),
    },
    {
      key: 'pending',
      header: 'Pending',
      align: 'right',
      render: (row) => (
        <span
          className={
            row.pending > 0 ? 'text-amber-400 font-medium' : 'text-[var(--content-tertiary)]'
          }
        >
          {row.pending.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'failed',
      header: 'Failed',
      align: 'right',
      render: (row) => (
        <span
          className={row.failed > 0 ? 'text-red-400 font-medium' : 'text-[var(--content-tertiary)]'}
        >
          {row.failed.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'openRate',
      header: 'Open Rate',
      align: 'right',
      render: (row) => <span className="font-semibold text-emerald-400">{row.openRate}%</span>,
    },
    {
      key: 'replyRate',
      header: 'Reply Rate',
      align: 'right',
      render: (row) => <span className="font-semibold text-brand-400">{row.replyRate}%</span>,
    },
  ];

  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              Campaign Performance
            </h3>
            <p className="text-xs text-[var(--content-secondary)]">
              Deliverability, open rate, and response metrics across all active and completed
              campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[var(--content-tertiary)]">Sort By:</span>
            <Select
              value={sortBy}
              onChange={(val) => setSortBy(val as SortField)}
              options={[
                { value: 'createdAt', label: 'Created Date' },
                { value: 'performanceScore', label: 'Overall Performance' },
                { value: 'openRate', label: 'Open Rate' },
                { value: 'replyRate', label: 'Reply Rate' },
              ]}
              className="w-40 text-xs"
            />
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors text-xs font-semibold"
              title="Toggle Direction"
            >
              {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
            </button>
          </div>
        </div>
      }
      padding="none"
    >
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          data={sortedCampaigns}
          keyExtractor={(row) => row.id}
          className="border-0 rounded-none min-w-[800px]"
        />
      </div>
    </Card>
  );
};
