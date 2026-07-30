import { Modal, Button, Badge } from '../ui';
import { CompletionSummaryData } from '@mailflow/shared';

interface CompletionSummaryModalProps {
  open: boolean;
  summary: CompletionSummaryData | null;
  onClose: () => void;
  onViewLogs: () => void;
}

export function CompletionSummaryModal({
  open,
  summary,
  onClose,
  onViewLogs,
}: CompletionSummaryModalProps) {
  if (!summary) return null;

  const hasErrors = summary.failed > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={hasErrors ? 'Campaign Completed with Errors' : 'Campaign Completed 🎉'}
      size="md"
    >
      <div className="space-y-6 py-2">
        {/* Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            hasErrors
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-green-500/30 bg-green-500/10 text-green-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              hasErrors ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            {hasErrors ? '⚠️' : '✓'}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--content-primary)]">
              {summary.campaignName}
            </h4>
            <p className="text-xs text-[var(--content-secondary)] mt-0.5">
              {hasErrors
                ? `${summary.sent} emails delivered successfully, ${summary.failed} failed.`
                : `All ${summary.total} emails delivered successfully!`}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
            <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
              Total Emails
            </p>
            <p className="text-xl font-bold text-[var(--content-primary)] mt-1">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center">
            <p className="text-2xs uppercase font-semibold text-green-400">Sent</p>
            <p className="text-xl font-bold text-green-400 mt-1">{summary.sent}</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center">
            <p className="text-2xs uppercase font-semibold text-red-400">Failed</p>
            <p className="text-xl font-bold text-red-400 mt-1">{summary.failed}</p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
            <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
              Time Taken
            </p>
            <p className="text-base font-bold text-[var(--content-primary)] mt-1">
              {summary.timeTaken}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center col-span-2 sm:col-span-2">
            <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
              Success Rate
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xl font-bold text-brand-400">{summary.successRate}%</span>
              <Badge variant={summary.successRate >= 90 ? 'success' : 'warning'} size="sm">
                {summary.successRate >= 90 ? 'Excellent' : 'Needs Review'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="outline" onClick={onViewLogs}>
            View Delivery Logs
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
