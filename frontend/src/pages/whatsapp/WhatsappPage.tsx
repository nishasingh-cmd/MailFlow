import { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '../../services/whatsapp.service';
import { WhatsappLogItem, WhatsappQueueItem, WhatsappStats } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Badge, Skeleton, Modal } from '../../components/ui';
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

function MessageSnippetCell({
  message,
  errorReason,
}: {
  message: string;
  errorReason?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 45;
  const isLong = Boolean(message && message.length > LIMIT);
  const snippet = isLong && !expanded ? `${message.slice(0, LIMIT)}...` : message;

  return (
    <div className="max-w-xs sm:max-w-sm text-xs space-y-1">
      <div className="leading-relaxed text-[var(--content-secondary)]">
        <span>{snippet}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="ml-1.5 font-bold text-brand-600 dark:text-brand-400 hover:underline inline-block cursor-pointer focus:outline-none"
          >
            {expanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>
      {errorReason && (
        <p
          className="text-2xs text-red-500 dark:text-red-400 font-sans break-words bg-red-500/10 dark:bg-red-950/30 px-1.5 py-0.5 rounded border border-red-500/20"
          title={errorReason}
        >
          {errorReason}
        </p>
      )}
    </div>
  );
}

export default function WhatsappPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'setup' | 'history' | 'failed'>('setup');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [tutorialModal, setTutorialModal] = useState<string | null>(null);

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

  const fetchHistory = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setHistoryLoading(true);
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
        if (!isSilent) toast.error('Failed to load WhatsApp delivery history.');
      } finally {
        if (!isSilent) setHistoryLoading(false);
      }
    },
    [search, statusFilter, page, toast]
  );

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
      fetchHistory(false);
    } else {
      fetchFailedQueue();
    }

    // Auto-refresh interval (polling every 3.5s for real-time status updates from Meta)
    const interval = setInterval(() => {
      if (activeTab === 'history') {
        fetchHistory(true);
        fetchStats();
      } else {
        fetchFailedQueue();
        fetchStats();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTab, fetchHistory, fetchFailedQueue, fetchStats]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            WhatsApp Outreach Engine
          </h1>
          <p className="text-sm text-[var(--content-secondary)] mt-1">
            Monitor AI personalized WhatsApp dispatches, message queues, webhooks, and live read
            status.
          </p>
        </div>

        <Link to="/settings">
          <Button variant="outline" size="sm">
            Configure WhatsApp API
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">Total Sent</p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">{stats.totalSent}</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">Delivered</p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">
            {stats.delivered || stats.totalSent}
          </p>
          <p className="text-2xs text-[var(--content-tertiary)] mt-0.5">
            {stats.deliveryRate || 100}% Rate
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">
            Read Receipts
          </p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">{stats.read}</p>
          <p className="text-2xs text-[var(--content-tertiary)] mt-0.5">
            {stats.readRate}% Read Rate
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">
            Pending Queue
          </p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">{stats.pending}</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">
            Failed Dispatches
          </p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">{stats.failed}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-[var(--surface-border)]">
        <button
          onClick={() => setActiveTab('setup')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          }`}
        >
          <span>API Setup Guide</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-500'
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

      {activeTab === 'setup' && (
        <div className="space-y-8 max-w-4xl py-2 animate-fade-in">
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Setup Your WhatsApp Business API Account</span>
              <span className="text-emerald-500 flex-shrink-0">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                </svg>
              </span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete the steps below to connect your WhatsApp API and start automating messages.
            </p>
          </div>

          {/* Stepper List */}
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Get Your WhatsApp Business API
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Get instant access to the WhatsApp Business API using your Facebook account.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setConnectModalOpen(true)}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                    </svg>
                    Connect WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Add Payment Method
                    </h3>
                    <button
                      onClick={() => setTutorialModal('payment')}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                    >
                      Watch tutorial
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Add a payment method in Facebook Business Manager to send template messages and
                    enable bulk messaging.
                  </p>
                </div>
                <div>
                  <a
                    href="https://business.facebook.com/billing_hub/payment_settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-sm font-semibold text-[var(--content-primary)] shadow-xs transition-all hover:border-brand-500/40"
                  >
                    Add Payment Method
                    <svg
                      className="w-3.5 h-3.5 text-[var(--content-tertiary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Facebook Business Verification
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Optional
                    </span>
                    <button
                      onClick={() => setTutorialModal('verification')}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                    >
                      Watch tutorial
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify your Facebook business to display your brand name instead of your phone
                    number and increase your messaging limits.
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Requirements:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li>Legal business document with business name</li>
                      <li>Working website</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <a
                    href="https://business.facebook.com/settings/security"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-sm font-semibold text-[var(--content-primary)] shadow-xs transition-all hover:border-brand-500/40"
                  >
                    Verify Business
                    <svg
                      className="w-3.5 h-3.5 text-[var(--content-tertiary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
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
            <div className="flex items-center gap-2">
              <div className="w-44">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchHistory(false);
                  fetchStats();
                }}
                title="Refresh delivery status"
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </Button>
            </div>
          </div>

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
                          <td className="px-4 py-3">
                            <MessageSnippetCell
                              message={log.message}
                              errorReason={log.errorReason}
                            />
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
                No failed WhatsApp jobs in queue! All dispatches operating normally.
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

      {/* Connect WhatsApp Modal */}
      <Modal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title="Connect WhatsApp Business API"
        size="md"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--content-secondary)]">
            MailFlow communicates directly with Meta Cloud API. Connect your Meta Developer App to
            enable live WhatsApp dispatches and real-time read receipts.
          </p>

          <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                Current Engine Status
              </span>
              <Badge variant={isMetaActive ? 'success' : 'neutral'} size="sm" dot>
                {isMetaActive ? 'Meta Cloud API Live' : 'Mock Mode Active'}
              </Badge>
            </div>
            <p className="text-xs text-[var(--content-secondary)]">
              {isMetaActive
                ? 'Your Meta credentials are configured. WhatsApp template messages are sent via your official Phone Number ID.'
                : 'Configure your Phone Number ID and System User Access Token in Settings to start sending live WhatsApp messages.'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--content-primary)]">Helpful Links:</p>
            <div className="flex flex-col gap-1.5 text-xs">
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline flex items-center gap-1"
              >
                Meta for Developers Portal ↗
              </a>
              <a
                href="https://business.facebook.com/settings/whatsapp-business-accounts"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline flex items-center gap-1"
              >
                Meta WhatsApp Business Accounts Manager ↗
              </a>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--surface-border)]">
            <Button variant="secondary" onClick={() => setConnectModalOpen(false)}>
              Close
            </Button>
            <Link to="/settings">
              <Button variant="primary">Open Settings</Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Tutorial Video / Instructions Modal */}
      <Modal
        open={tutorialModal !== null}
        onClose={() => setTutorialModal(null)}
        title={
          tutorialModal === 'payment'
            ? 'How to Add Payment Method'
            : 'Facebook Business Verification'
        }
        size="md"
      >
        <div className="space-y-4 py-2">
          {tutorialModal === 'payment' ? (
            <>
              <p className="text-sm text-[var(--content-secondary)]">
                Meta requires a valid credit/debit card attached to your Business Manager to
                authorize WhatsApp template messaging outside the free 24-hour service window.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--content-primary)]">
                <li>
                  Log in to <strong>Meta Business Manager</strong>.
                </li>
                <li>
                  Navigate to <strong>Billing & Payments</strong> &gt;{' '}
                  <strong>Payment Methods</strong>.
                </li>
                <li>
                  Click <strong>Add Payment Method</strong> and save your card details.
                </li>
                <li>
                  Link the payment method to your <strong>WhatsApp Business Account (WABA)</strong>.
                </li>
              </ol>
              <div className="pt-3 flex justify-end gap-2">
                <a
                  href="https://business.facebook.com/billing_hub/payment_settings"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                >
                  Go to Meta Billing ↗
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--content-secondary)]">
                Business verification ensures your brand name (rather than a raw phone number) is
                displayed to recipients and unlocks unlimited messaging tiers.
              </p>
              <div className="space-y-2 text-xs text-[var(--content-primary)]">
                <p className="font-semibold">Checklist:</p>
                <ul className="list-disc list-inside space-y-1 text-[var(--content-secondary)]">
                  <li>Official Certificate of Incorporation / Business Registration</li>
                  <li>Utility bill or bank statement showing business legal address</li>
                  <li>Live website matching the company domain</li>
                </ul>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <a
                  href="https://business.facebook.com/settings/security"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                >
                  Open Meta Security Center ↗
                </a>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
