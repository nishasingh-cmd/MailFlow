import { useState, useEffect, useCallback } from 'react';
import { deliveryService } from '../../services/delivery.service';
import { EmailQueueItem, FailedQueueQuery } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Input, Button, Badge, EmptyState, Skeleton, Modal } from '../../components/ui';

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

export default function FailedQueuePage() {
  const { toast } = useToast();

  const [jobs, setJobs] = useState<EmailQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchFailedQueue = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const query: FailedQueueQuery = {
          search: search || undefined,
          page: pageNum,
          limit: 15,
        };
        const res = await deliveryService.getFailedQueue(query);
        setJobs(res.jobs);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setSelectedIds([]);
      } catch {
        toast.error('Failed to load failed queue jobs.');
      } finally {
        setLoading(false);
      }
    },
    [search, toast]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchFailedQueue(1), 300);
    return () => clearTimeout(t);
  }, [fetchFailedQueue]);

  const toggleJob = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((s) => s !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    const pageIds = jobs.map((j) => j.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const handleRetry = async (targetIds?: string[]) => {
    setRetrying(true);
    try {
      const res = await deliveryService.retryFailedJobs(targetIds);
      toast.success(res.message);
      fetchFailedQueue(page);
    } catch {
      toast.error('Failed to retry selected jobs.');
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async (targetIds?: string[]) => {
    setDeleting(true);
    try {
      const res = await deliveryService.deleteFailedJobs(targetIds);
      toast.success(res.message);
      setDeleteConfirmOpen(false);
      fetchFailedQueue(1);
    } catch {
      toast.error('Failed to delete failed queue jobs.');
    } finally {
      setDeleting(false);
    }
  };

  const pageIds = jobs.map((j) => j.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight flex items-center gap-2">
            Failed Email Queue
            {total > 0 && (
              <Badge variant="error" size="sm">
                {total}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-[var(--content-secondary)] mt-0.5">
            Review failed delivery jobs, inspect error diagnostics, and retry or purge failed email
            tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRetry()}
                loading={retrying}
                disabled={retrying || deleting}
              >
                Retry All ({total})
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={retrying || deleting}
              >
                Delete All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar & Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Input
          id="failed-queue-search"
          placeholder="Search failed jobs by recipient, subject..."
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
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-brand-400 whitespace-nowrap">
              {selectedIds.length} selected
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRetry(selectedIds)}
              loading={retrying}
              disabled={retrying || deleting}
            >
              Retry Selected
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(selectedIds)}
              loading={deleting}
              disabled={retrying || deleting}
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-elevated)]">
              <tr>
                <th className="w-10 px-3 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                  Attempts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3">
                    <Skeleton className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-32 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-40 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-48 h-3" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton variant="text" className="w-12 h-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : jobs.length > 0 ? (
        <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)]">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-[var(--surface-border)] accent-brand-500 cursor-pointer"
                      aria-label="Select all failed jobs"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Subject & Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Failure Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell">
                    Last Attempt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {jobs.map((job) => {
                  const isSelected = selectedIds.includes(job.id);
                  return (
                    <tr
                      key={job.id}
                      className={`hover:bg-[var(--surface-elevated)] transition-colors ${
                        isSelected ? 'bg-brand-500/8' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleJob(job.id)}
                          className="w-4 h-4 rounded border-[var(--surface-border)] accent-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--content-primary)]">
                          {job.lead?.name || job.recipientEmail}
                        </div>
                        <div className="text-xs text-[var(--content-tertiary)]">
                          {job.recipientEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--content-primary)] truncate max-w-xs">
                          {job.subject}
                        </p>
                        <p className="text-xs text-brand-400 mt-0.5">
                          {job.campaign?.name || 'Campaign'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded inline-block max-w-xs truncate"
                          title={job.errorMessage || undefined}
                        >
                          {job.errorMessage || 'SMTP Connection Error'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--content-secondary)] hidden sm:table-cell font-mono">
                        {job.attempts} / {job.maxRetries}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--content-tertiary)] hidden md:table-cell">
                        {formatDateTime(job.lastAttemptAt || job.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry([job.id])}
                            disabled={retrying}
                          >
                            Retry
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDelete([job.id])}
                            disabled={deleting}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No failed email jobs"
          description={
            search
              ? 'No failed jobs match your search.'
              : 'All campaign email queue jobs are processing smoothly without failures.'
          }
          action={
            search
              ? {
                  label: 'Clear Search',
                  onClick: () => setSearch(''),
                }
              : undefined
          }
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--content-secondary)] pt-2">
          <span>Failed Queue Items: {total}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFailedQueue(page - 1)}
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
              onClick={() => fetchFailedQueue(page + 1)}
              disabled={page >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete All Failed Jobs"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete()} loading={deleting}>
              Confirm Delete All
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--content-secondary)]">
          Are you sure you want to delete all{' '}
          <span className="font-semibold text-red-400">{total}</span> failed queue jobs? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
