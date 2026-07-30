import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from '../../services/delivery.service';
import { EmailLogItem, DeliveryLogsQuery } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Input, Select, Badge, Button, EmptyState, Skeleton } from '../../components/ui';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
];

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DeliveryLogsPage() {
  const { toast } = useToast();

  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');

  const fetchLogs = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const query: DeliveryLogsQuery = {
          search: search || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page: pageNum,
          limit: 15,
        };
        const res = await deliveryService.getLogs(query);
        setLogs(res.logs);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch {
        toast.error('Failed to load delivery logs.');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(1), 300);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Delivery Logs
          </h1>
          <p className="text-sm text-[var(--content-secondary)] mt-0.5">
            Audit history of all dispatched emails, delivery providers, retry counts, and failure
            reasons.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(page)} loading={loading}>
          Refresh Logs
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          id="delivery-logs-search"
          placeholder="Search by recipient, subject, lead name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          leftIcon={
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
        <Select
          id="delivery-logs-status-filter"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as 'ALL' | 'SENT' | 'FAILED')}
          options={STATUS_FILTER_OPTIONS}
          className="w-40"
        />
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-elevated)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Sent Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-32 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-48 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-24 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-28 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-16 h-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : logs.length > 0 ? (
        <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                    Dispatched Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden lg:table-cell">
                    Retries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--content-primary)]">
                        {log.lead?.name || log.recipientEmail}
                      </div>
                      <div className="text-xs text-[var(--content-tertiary)]">
                        {log.recipientEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--content-primary)] font-medium max-w-xs truncate">
                        {log.subject}
                      </p>
                      {log.errorReason && (
                        <p
                          className="text-xs text-red-400 truncate max-w-xs mt-0.5"
                          title={log.errorReason}
                        >
                          {log.errorReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] hidden md:table-cell">
                      {log.campaign?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] text-xs hidden sm:table-cell">
                      {formatDateTime(log.sentAt || log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--content-secondary)] text-xs hidden lg:table-cell">
                      {log.retryCount > 0 ? `${log.retryCount} retry` : '0'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={log.status === 'SENT' ? 'success' : 'error'} size="sm" dot>
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No delivery logs found"
          description={
            search || statusFilter !== 'ALL'
              ? 'No logs match your search criteria.'
              : 'Dispatch campaign emails to view execution and delivery records.'
          }
          action={
            search || statusFilter !== 'ALL'
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearch('');
                    setStatusFilter('ALL');
                  },
                }
              : undefined
          }
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--content-secondary)] pt-2">
          <span>Total Logs: {total}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
            >
              ← Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
