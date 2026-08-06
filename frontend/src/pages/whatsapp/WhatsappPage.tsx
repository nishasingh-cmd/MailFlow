import { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '../../services/whatsapp.service';
import { WhatsappLogItem, WhatsappQueueItem, WhatsappStats } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Badge, Skeleton } from '../../components/ui';
import { Link } from 'react-router-dom';

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'READ', label: 'Read' },
  { value: 'FAILED', label: 'Failed' },
];

export default function WhatsappPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'history' | 'failed'>('history');

  const [stats, setStats] = useState<WhatsappStats>({
    totalSent: 0,
    delivered: 0,
    read: 0,
    pending: 0,
    failed: 0,
    successRate: 100,
    deliveryRate: 0,
    readRate: 0,
    provider: 'MOCK',
  });

  const [logs, setLogs] = useState<WhatsappLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [failedJobs, setFailedJobs] = useState<WhatsappQueueItem[]>([]);
  const [failedLoading, setFailedLoading] = useState(false);
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const s = await whatsappService.getStats();
      setStats(s);
    } catch (err: unknown) {
      void err;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await whatsappService.getHistory({
        search: search || undefined,
        status:
          statusFilter !== 'ALL'
            ? (statusFilter as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED')
            : undefined,

        page,
        limit: 15,
      });
      setLogs(res.logs);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast.error('Failed to load WhatsApp delivery history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [search, statusFilter, page, toast]);

  // Fetch Failed Queue Jobs
  const fetchFailedQueue = useCallback(async () => {
    setFailedLoading(true);
    try {
      const res = await whatsappService.getFailedQueue({ page: 1, limit: 50 });
      setFailedJobs(res.jobs);
    } catch {
      toast.error('Failed to load WhatsApp failed queue.');
    } finally {
      setFailedLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else {
      fetchFailedQueue();
    }
  }, [activeTab, fetchHistory, fetchFailedQueue]);

  // Handle retry
  const handleRetry = async (jobIds?: string[]) => {
    setActionLoading(true);
    try {
      const res = await whatsappService.retryFailedJobs(jobIds);
      toast.success(res.message);
      setSelectedFailedIds([]);
      fetchFailedQueue();
      fetchStats();
    } catch {
      toast.error('Failed to retry WhatsApp jobs.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (jobIds?: string[]) => {
    setActionLoading(true);
    try {
      const res = await whatsappService.deleteFailedJobs(jobIds);
      toast.success(res.message);
      setSelectedFailedIds([]);
      fetchFailedQueue();
      fetchStats();
    } catch {
      toast.error('Failed to delete failed queue jobs.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAllFailed = () => {
    if (selectedFailedIds.length === failedJobs.length) {
      setSelectedFailedIds([]);
    } else {
      setSelectedFailedIds(failedJobs.map((j) => j.id));
    }
  };

  const toggleSelectFailed = (id: string) => {
    setSelectedFailedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isMetaActive = stats.provider === 'META_CLOUD';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              💬 WhatsApp Outreach Engine
            </h1>
            <Badge variant={isMetaActive ? 'success' : 'brand'} size="md" dot>
              {isMetaActive ? 'Provider: META CLOUD API' : 'Provider: MOCK'}
            </Badge>
          </div>
          <p className="text-sm text-[var(--content-secondary)] mt-1">
            Monitor AI personalized WhatsApp dispatches, message queues, webhooks, and live read
            status.
          </p>
        </div>

        <Link to="/settings">
          <Button variant="outline" size="sm">
            ⚙️ Configure WhatsApp API
          </Button>
        </Link>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)] tracking-wider">
            Total Sent
          </p>
          <p className="text-xl font-bold text-[var(--content-primary)] mt-1">{stats.totalSent}</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-semibold text-green-400 tracking-wider">
            Delivered
          </p>
          <p className="text-xl font-bold text-green-400 mt-1">
            {stats.delivered || stats.totalSent}
          </p>
          <p className="text-2xs text-[var(--content-tertiary)] mt-0.5">
            {stats.deliveryRate || 100}% Rate
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-semibold text-emerald-400 tracking-wider">
            Read Receipts
          </p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{stats.read}</p>
          <p className="text-2xs text-[var(--content-tertiary)] mt-0.5">
            {stats.readRate}% Read Rate
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-semibold text-brand-400 tracking-wider">
            Pending Queue
          </p>
          <p className="text-xl font-bold text-brand-400 mt-1">{stats.pending}</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-semibold text-red-400 tracking-wider">
            Failed Dispatches
          </p>
          <p className="text-xl font-bold text-red-400 mt-1">{stats.failed}</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-4 border-b border-[var(--surface-border)]">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          }`}
        >
          Delivery History ({stats.totalSent})
        </button>
        <button
          onClick={() => setActiveTab('failed')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'failed'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          }`}
        >
          Failed Queue ({stats.failed})
        </button>
      </div>

      {/* TAB 1: HISTORY LOGS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <Input
                placeholder="Search phone, lead name, message ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-48">
              <Select
                id="status-filter"
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden shadow-elevation-1">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="rect" className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-sm text-[var(--content-tertiary)]">
                No WhatsApp delivery logs found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-elevated)] text-2xs uppercase text-[var(--content-tertiary)] font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Message ID</th>
                      <th className="px-4 py-3 text-left">Message Snippet</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Sent Time</th>
                      <th className="px-4 py-3 text-left">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)]">
                    {logs.map((log) => {
                      let statusVariant: 'success' | 'info' | 'error' | 'brand' = 'brand';
                      if (log.status === 'READ') statusVariant = 'success';
                      else if (log.status === 'DELIVERED') statusVariant = 'info';
                      else if (log.status === 'FAILED') statusVariant = 'error';

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-[var(--surface-elevated)] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-[var(--content-primary)]">
                              {log.lead?.name || '—'}
                            </p>
                            <p className="text-2xs text-[var(--content-tertiary)]">
                              {log.lead?.company || 'Individual Lead'}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-400">
                            {log.phone}
                          </td>
                          <td
                            className="px-4 py-3 font-mono text-2xs text-[var(--content-tertiary)] max-w-[120px] truncate"
                            title={log.messageId || ''}
                          >
                            {log.messageId || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--content-secondary)] max-w-xs truncate">
                            {log.message}
                            {log.errorReason && (
                              <p className="text-2xs text-red-400 font-sans mt-0.5">
                                {log.errorReason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant} size="sm">
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--content-tertiary)]">
                            {formatDateTime(log.sentAt || log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={log.provider === 'META_CLOUD' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {log.provider || 'MOCK'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--surface-border)] text-xs">
              <span className="text-[var(--content-tertiary)]">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAILED QUEUE */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--content-secondary)]">
              Select failed jobs to re-queue or purge:
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRetry(selectedFailedIds)}
                loading={actionLoading}
                disabled={selectedFailedIds.length === 0 || actionLoading}
              >
                Retry Selected ({selectedFailedIds.length})
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRetry()}
                loading={actionLoading}
                disabled={failedJobs.length === 0 || actionLoading}
              >
                Retry All Failed
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedFailedIds)}
                loading={actionLoading}
                disabled={selectedFailedIds.length === 0 || actionLoading}
              >
                Delete Selected
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden shadow-elevation-1">
            {failedLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} variant="rect" className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : failedJobs.length === 0 ? (
              <div className="p-12 text-center text-sm text-[var(--content-tertiary)]">
                ✅ No failed WhatsApp jobs in queue! All dispatches operating normally.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-elevated)] text-2xs uppercase text-[var(--content-tertiary)] font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedFailedIds.length > 0 &&
                            selectedFailedIds.length === failedJobs.length
                          }
                          onChange={toggleSelectAllFailed}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Error Diagnostics</th>
                      <th className="px-4 py-3 text-left">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)]">
                    {failedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-[var(--surface-elevated)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedFailedIds.includes(job.id)}
                            onChange={() => toggleSelectFailed(job.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--content-primary)]">
                            {job.lead?.name || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-400">{job.phone}</td>
                        <td className="px-4 py-3 text-xs text-red-400 max-w-sm truncate">
                          {job.errorMessage || 'Unknown network error'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--content-tertiary)]">
                          {job.attempts} / {job.maxRetries}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
