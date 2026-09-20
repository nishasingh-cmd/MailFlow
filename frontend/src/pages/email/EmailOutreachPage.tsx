import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from '../../services/delivery.service';
import { EmailLogItem, EmailQueueItem, EmailStats } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Badge, Skeleton, Modal, ExpandableText } from '../../components/ui';
import { Link } from 'react-router-dom';
import { resolveDeliveryError } from '../../utils/errorDiagnostics';
import { SmtpSettingsForm } from '../../components/smtp/SmtpSettingsForm';

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ErrorDiagnosticsCell({ errorMessage }: { errorMessage?: string | null }) {
  const diagnostic = resolveDeliveryError(errorMessage);
  return (
    <div className="w-full min-w-0 space-y-1.5 py-1">
      <span className="inline-block px-1.5 py-0.5 rounded text-2xs font-bold font-mono bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
        {diagnostic.badge}
      </span>
      <ExpandableText
        text={errorMessage || 'Delivery failed'}
        limit={55}
        textClassName="text-red-300"
      />
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-1.5">
        <span className="font-bold text-amber-400 shrink-0 text-xs mt-0.5">💡 Fix:</span>
        <ExpandableText
          text={diagnostic.solution}
          limit={55}
          textClassName="text-amber-100"
          className="flex-1 min-w-0"
        />
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPENED', label: 'Opened (Seen)' },
  { value: 'SENT', label: 'Delivered (Unopened)' },
  { value: 'FAILED', label: 'Failed' },
];

export default function EmailOutreachPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'setup' | 'history' | 'failed'>('setup');
  const [guideModal, setGuideModal] = useState<'dns' | 'warmup' | 'gmail' | null>(null);

  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    pending: 0,
    failed: 0,
    successRate: 100,
    deliveryRate: 0,
    openRate: 0,
    provider: 'NOT_CONFIGURED',
  });

  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPENED' | 'SENT' | 'FAILED'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [failedJobs, setFailedJobs] = useState<EmailQueueItem[]>([]);
  const [failedLoading, setFailedLoading] = useState(false);
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const s = await deliveryService.getStats();
      setStats(s);
    } catch (err: unknown) {
      void err;
    }
  }, []);

  const fetchHistory = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setHistoryLoading(true);
      try {
        const res = await deliveryService.getLogs({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          page,
          limit: 15,
        });
        setLogs(res.logs);
        setTotalPages(res.totalPages || 1);
      } catch {
        if (!isSilent) toast.error('Failed to load email delivery history.');
      } finally {
        if (!isSilent) setHistoryLoading(false);
      }
    },
    [search, statusFilter, page, toast]
  );

  const fetchFailedQueue = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setFailedLoading(true);
      try {
        const res = await deliveryService.getFailedQueue({ page: 1, limit: 50 });
        setFailedJobs(res.jobs);
      } catch {
        if (!isSilent) toast.error('Failed to load email failed queue.');
      } finally {
        if (!isSilent) setFailedLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(false);
    } else if (activeTab === 'failed') {
      fetchFailedQueue(false);
    }

    // Auto-refresh interval (silent polling for real-time delivery status updates without UI flickering)
    const interval = setInterval(() => {
      if (activeTab === 'history') {
        fetchHistory(true);
        fetchStats();
      } else if (activeTab === 'failed') {
        fetchFailedQueue(true);
        fetchStats();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, fetchHistory, fetchFailedQueue, fetchStats]);

  const handleRetry = async (jobIds?: string[]) => {
    setActionLoading(true);
    try {
      const res = await deliveryService.retryFailedJobs(jobIds);
      toast.success(res.message);
      setSelectedFailedIds([]);
      fetchFailedQueue();
      fetchStats();
    } catch {
      toast.error('Failed to retry email jobs.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (jobIds?: string[]) => {
    setActionLoading(true);
    try {
      const res = await deliveryService.deleteFailedJobs(jobIds);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Email Outreach Engine
          </h1>
          <p className="text-sm text-[var(--content-secondary)] mt-1">
            Monitor AI personalized email dispatches, message queues, SMTP delivery, and live open
            status.
          </p>
        </div>

        <Link to="/settings">
          <Button variant="outline" size="sm">
            Configure SMTP / Email API
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
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
            {stats.deliveryRate || (stats.totalSent > 0 ? 100 : 0)}% Rate
          </p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-elevation-1">
          <p className="text-2xs uppercase font-bold text-[#5271ff] tracking-wider">Open Rate</p>
          <p className="text-xl font-bold text-[#5271ff] mt-1">{stats.opened}</p>
          <p className="text-2xs text-[var(--content-tertiary)] mt-0.5">
            {stats.openRate}% Open Rate
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

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[var(--surface-border)]">
        <button
          onClick={() => setActiveTab('setup')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          }`}
        >
          <span>SMTP Setup Guide</span>
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

      {/* TAB 1: SMTP SETUP GUIDE */}
      {activeTab === 'setup' && (
        <div className="space-y-8 max-w-4xl py-2 animate-fade-in">
          <div className="space-y-1.5">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Setup Your Email Delivery &amp; SMTP Provider</span>
              <span className="text-brand-500 flex-shrink-0">
                <svg
                  className="w-8 h-8"
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
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete the steps below to link your sending mailbox, authenticate SPF/DKIM DNS, and
              ensure 99%+ inbox placement.
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Connect Your Sending Mailbox (SMTP)
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect Google Workspace (Gmail App Password), Microsoft 365, SendGrid, Resend,
                    Amazon SES, or custom SMTP server.
                  </p>
                </div>

                {/* Embedded SMTP Settings Form */}
                <div className="pt-2">
                  <SmtpSettingsForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="email-history-search"
              placeholder="Search by recipient, subject, or company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

            <div className="w-full sm:w-48">
              <Select
                id="email-status-filter"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val as 'ALL' | 'SENT' | 'FAILED');
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden shadow-elevation-1">
            {historyLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] text-[var(--content-tertiary)] flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-[var(--content-primary)]">
                  No email records found
                </p>
                <p className="text-xs text-[var(--content-secondary)] mt-1">
                  {search || statusFilter !== 'ALL'
                    ? 'Try clearing your search query or status filter.'
                    : 'Dispatched emails will show up here with live status updates.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* table-layout:fixed: column widths never change on expand */}
                <table
                  className="w-full text-left text-sm text-[var(--content-secondary)]"
                  style={{ tableLayout: 'fixed' }}
                >
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    {/* Recipient */}
                    <col style={{ width: '20%' }} />
                    {/* Email Address */}
                    <col style={{ width: '25%' }} />
                    {/* Subject / Snippet */}
                    <col style={{ width: '12%' }} />
                    {/* Status */}
                    <col style={{ width: '13%' }} />
                    {/* Sent Time */}
                    <col style={{ width: '10%' }} />
                    {/* Provider */}
                  </colgroup>
                  <thead className="bg-[var(--surface-elevated)] text-2xs uppercase font-semibold text-[var(--content-tertiary)] border-b border-[var(--surface-border)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Email Address</th>
                      <th className="px-4 py-3 text-left">Subject / Snippet</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Sent Time</th>
                      <th className="px-4 py-3 text-left">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)]">
                    {logs.map((log) => {
                      const isOpened = log.status === 'OPENED';
                      let statusVariant: 'success' | 'info' | 'error' | 'brand' = 'brand';
                      let statusLabel = 'DELIVERED';

                      if (isOpened) {
                        statusVariant = 'success';
                        statusLabel = 'OPENED';
                      } else if (log.status === 'SENT') {
                        statusVariant = 'info';
                        statusLabel = 'DELIVERED';
                      } else if (log.status === 'FAILED') {
                        statusVariant = 'error';
                        statusLabel = 'FAILED';
                      }

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
                              {log.lead?.company || 'Individual Contact'}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-400">
                            {log.recipientEmail}
                          </td>
                          <td
                            className="px-4 py-3 text-xs text-[var(--content-secondary)] max-w-sm"
                            title={log.subject}
                          >
                            <p className="font-medium text-[var(--content-primary)] truncate">
                              {log.subject}
                            </p>
                            {log.errorReason && (
                              <p
                                className="text-2xs text-red-400 font-sans mt-0.5 truncate"
                                title={log.errorReason}
                              >
                                {log.errorReason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant} size="sm" dot={isOpened}>
                              {statusLabel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--content-tertiary)]">
                            <div>{formatDateTime(log.sentAt || log.createdAt)}</div>
                            {isOpened && log.openedAt && (
                              <div
                                className="text-2xs text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5"
                                title={`Opened at ${formatDateTime(log.openedAt)}`}
                              >
                                <svg
                                  className="w-3 h-3 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                <span>Seen {formatDateTime(log.openedAt)}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="neutral" size="sm">
                              {log.provider || 'SMTP'}
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

      {/* TAB 3: FAILED QUEUE */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--content-secondary)]">
              Select failed emails to re-queue or purge:
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
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedFailedIds)}
                loading={actionLoading}
                disabled={selectedFailedIds.length === 0 || actionLoading}
              >
                Delete Selected ({selectedFailedIds.length})
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden shadow-elevation-1">
            {failedLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : failedJobs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-[var(--content-primary)]">Clean Failed Queue</p>
                <p className="text-xs text-[var(--content-secondary)] mt-1">
                  All email jobs are running smoothly. No dispatches in the failed queue.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* table-layout:fixed: column widths never change on expand */}
                <table
                  className="w-full text-left text-sm text-[var(--content-secondary)]"
                  style={{ tableLayout: 'fixed' }}
                >
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    {/* Checkbox */}
                    <col style={{ width: '22%' }} />
                    {/* Recipient */}
                    <col style={{ width: '18%' }} />
                    {/* Subject */}
                    <col style={{ width: '35%' }} />
                    {/* Error Diagnostics */}
                    <col style={{ width: '10%' }} />
                    {/* Attempts */}
                    <col style={{ width: '10%' }} />
                    {/* Action */}
                  </colgroup>
                  <thead className="bg-[var(--surface-elevated)] text-2xs uppercase font-semibold text-[var(--content-tertiary)] border-b border-[var(--surface-border)]">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            failedJobs.length > 0 && selectedFailedIds.length === failedJobs.length
                          }
                          onChange={toggleSelectAllFailed}
                          className="rounded border-[var(--surface-border)]"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">Error Diagnostics</th>
                      <th className="px-4 py-3 text-left">Attempts</th>
                      <th className="px-4 py-3 text-left">Action</th>
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
                            className="rounded border-[var(--surface-border)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--content-primary)]">
                            {job.lead?.name || '—'}
                          </p>
                          <p className="text-2xs font-mono text-brand-400">{job.recipientEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--content-primary)] max-w-xs truncate">
                          {job.subject}
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <ErrorDiagnosticsCell errorMessage={job.errorMessage} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--content-tertiary)]">
                          {job.attempts} / {job.maxRetries}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry([job.id])}
                            disabled={actionLoading}
                          >
                            Retry
                          </Button>
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

      {/* Guide Modals */}
      <Modal
        open={guideModal !== null}
        onClose={() => setGuideModal(null)}
        title={
          guideModal === 'dns'
            ? 'SPF, DKIM & DMARC DNS Guide'
            : guideModal === 'warmup'
              ? 'Email Warm-up Schedule & Guidelines'
              : 'Gmail App Password Setup'
        }
        size="md"
      >
        <div className="space-y-4 py-2">
          {guideModal === 'gmail' && (
            <div className="space-y-3 text-xs text-[var(--content-primary)]">
              <p className="text-sm text-[var(--content-secondary)]">
                Google requires a 16-character <strong>App Password</strong> for third-party email
                sending instead of your normal account password.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Go to your <strong>Google Account</strong> (myaccount.google.com).
                </li>
                <li>
                  Navigate to <strong>Security</strong> &gt; <strong>2-Step Verification</strong>.
                </li>
                <li>
                  Scroll down to <strong>App Passwords</strong>.
                </li>
                <li>
                  Create an App named <strong>MailFlow</strong> and copy the 16-character code.
                </li>
                <li>
                  Paste it in MailFlow Settings with host{' '}
                  <code className="bg-[var(--surface-elevated)] px-1 rounded">smtp.gmail.com</code>{' '}
                  and port <code className="bg-[var(--surface-elevated)] px-1 rounded">587</code>.
                </li>
              </ol>
              <div className="pt-3 flex justify-end gap-2">
                <Link to="/settings">
                  <Button variant="primary" size="sm">
                    Go to Settings
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {guideModal === 'dns' && (
            <div className="space-y-3 text-xs text-[var(--content-primary)]">
              <p className="text-sm text-[var(--content-secondary)]">
                Configuring DNS records guarantees recipient mail servers recognize your identity
                and prevents landing in the spam folder.
              </p>
              <div className="space-y-2">
                <p className="font-semibold text-brand-500">1. SPF (Sender Policy Framework):</p>
                <div className="p-2 rounded bg-[var(--surface-elevated)] font-mono text-2xs">
                  Type: TXT | Name: @ | Value: v=spf1 include:_spf.google.com ~all
                </div>

                <p className="font-semibold text-brand-500 mt-2">
                  2. DKIM (DomainKeys Identified Mail):
                </p>
                <p className="text-2xs text-[var(--content-secondary)]">
                  Generate your 2048-bit DKIM key from your Google Workspace or email admin console
                  and paste the public key into your DNS TXT record.
                </p>

                <p className="font-semibold text-brand-500 mt-2">3. DMARC:</p>
                <div className="p-2 rounded bg-[var(--surface-elevated)] font-mono text-2xs">
                  Type: TXT | Name: _dmarc | Value: v=DMARC1; p=none; sp=none;
                </div>
              </div>
            </div>
          )}

          {guideModal === 'warmup' && (
            <div className="space-y-3 text-xs text-[var(--content-primary)]">
              <p className="text-sm text-[var(--content-secondary)]">
                Avoid sending 500 emails on day 1. Gradually increase your sending volume following
                this battle-tested ramp:
              </p>
              <div className="border border-[var(--surface-border)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-2xs">
                  <thead className="bg-[var(--surface-elevated)] font-semibold">
                    <tr>
                      <th className="p-2">Period</th>
                      <th className="p-2">Daily Limit</th>
                      <th className="p-2">Delay Between Emails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)]">
                    <tr>
                      <td className="p-2 font-medium">Days 1 - 3</td>
                      <td className="p-2">20 emails/day</td>
                      <td className="p-2">60 - 120s</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Days 4 - 7</td>
                      <td className="p-2">50 emails/day</td>
                      <td className="p-2">45 - 90s</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Week 2</td>
                      <td className="p-2">100 emails/day</td>
                      <td className="p-2">30 - 60s</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Week 3+</td>
                      <td className="p-2">250+ emails/day</td>
                      <td className="p-2">20 - 45s</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
