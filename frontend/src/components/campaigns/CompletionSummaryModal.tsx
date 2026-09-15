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
  const channel = summary.channel || 'EMAIL';
  const isWhatsapp = channel === 'WHATSAPP';
  const isMultiChannel = channel === 'EMAIL_AND_WHATSAPP';

  const modalTitle = hasErrors
    ? isMultiChannel
      ? 'Multi-Channel Campaign Completed with Errors'
      : isWhatsapp
        ? 'WhatsApp Campaign Completed with Errors'
        : 'Email Campaign Completed with Errors'
    : isMultiChannel
      ? 'Multi-Channel Campaign Completed'
      : isWhatsapp
        ? 'WhatsApp Campaign Completed'
        : 'Campaign Completed';

  const emailSent =
    summary.emailStats?.sent ?? (isMultiChannel ? Math.round(summary.sent / 2) : summary.sent);
  const emailTotal =
    summary.emailStats?.total ?? (isMultiChannel ? Math.round(summary.total / 2) : summary.total);
  const emailFailed = summary.emailStats?.failed ?? 0;

  const waSent =
    summary.whatsappStats?.sent ?? (isMultiChannel ? Math.round(summary.sent / 2) : summary.sent);
  const waTotal =
    summary.whatsappStats?.total ??
    (isMultiChannel ? Math.round(summary.total / 2) : summary.total);
  const waFailed = summary.whatsappStats?.failed ?? 0;

  const totalLeads = summary.totalLeads || (isMultiChannel ? emailTotal : summary.total);

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="md">
      <div className="space-y-6 py-2">
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            hasErrors
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-brand-500/30 bg-brand-500/10 text-brand-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
              hasErrors ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-500/20 text-brand-400'
            }`}
          >
            {hasErrors ? (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--content-primary)]">
              {summary.campaignName}
            </h4>
            <p className="text-xs text-[var(--content-secondary)] mt-0.5">
              {isMultiChannel
                ? hasErrors
                  ? `${summary.sent} of ${summary.total} multi-channel dispatches delivered (${emailSent} emails, ${waSent} WhatsApp messages), ${summary.failed} failed.`
                  : `All ${summary.total} dispatches delivered successfully across Email & WhatsApp (${emailSent} emails + ${waSent} WhatsApp messages)!`
                : isWhatsapp
                  ? hasErrors
                    ? `${summary.sent} of ${summary.total} WhatsApp messages delivered successfully, ${summary.failed} failed.`
                    : `All ${summary.total} WhatsApp messages delivered successfully via Meta Cloud API!`
                  : hasErrors
                    ? `${summary.sent} of ${summary.total} emails delivered successfully, ${summary.failed} failed.`
                    : `All ${summary.total} emails delivered successfully!`}
            </p>
          </div>
        </div>

        {isMultiChannel ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                  Total Leads
                </p>
                <p className="text-xl font-bold text-[var(--content-primary)] mt-1">{totalLeads}</p>
                <span className="text-2xs text-[var(--content-tertiary)] block mt-0.5">
                  Target prospects
                </span>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-blue-400">Emails Sent</p>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  {emailSent}{' '}
                  <span className="text-xs font-normal text-blue-300">/ {emailTotal}</span>
                </p>
                {emailFailed > 0 ? (
                  <span className="text-2xs text-red-400 block mt-0.5">{emailFailed} failed</span>
                ) : (
                  <span className="text-2xs text-blue-400/70 block mt-0.5">Delivered</span>
                )}
              </div>
              <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-brand-400">WhatsApp Sent</p>
                <p className="text-xl font-bold text-brand-400 mt-1">
                  {waSent} <span className="text-xs font-normal text-brand-300">/ {waTotal}</span>
                </p>
                {waFailed > 0 ? (
                  <span className="text-2xs text-red-400 block mt-0.5">{waFailed} failed</span>
                ) : (
                  <span className="text-2xs text-brand-400/70 block mt-0.5">Delivered</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                  Total Dispatches
                </p>
                <p className="text-lg font-bold text-[var(--content-primary)] mt-1">
                  {summary.total}
                </p>
                <span className="text-2xs text-[var(--content-tertiary)] block mt-0.5">
                  {summary.sent} sent{summary.failed > 0 ? `, ${summary.failed} failed` : ''}
                </span>
              </div>
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                  Time Taken
                </p>
                <p className="text-lg font-bold text-[var(--content-primary)] mt-1">
                  {summary.timeTaken}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
                <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                  Success Rate
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-lg font-bold text-brand-400">{summary.successRate}%</span>
                  <Badge variant={summary.successRate >= 90 ? 'brand' : 'warning'} size="sm">
                    {summary.successRate >= 90 ? '✓' : '!'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
              <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                {isWhatsapp ? 'Total Messages' : 'Total Emails'}
              </p>
              <p className="text-xl font-bold text-[var(--content-primary)] mt-1">
                {summary.total}
              </p>
            </div>
            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-center">
              <p className="text-2xs uppercase font-semibold text-brand-400">Sent</p>
              <p className="text-xl font-bold text-brand-400 mt-1">{summary.sent}</p>
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
                <Badge variant={summary.successRate >= 90 ? 'brand' : 'warning'} size="sm">
                  {summary.successRate >= 90 ? 'Excellent' : 'Needs Review'}
                </Badge>
              </div>
            </div>
          </div>
        )}

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
