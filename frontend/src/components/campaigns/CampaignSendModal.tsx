import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Badge } from '../ui';
import { deliveryService, CampaignPreview } from '../../services/delivery.service';
import { CampaignProgress } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';

interface CampaignSendModalProps {
  open: boolean;
  campaignId: string | null;
  campaignName?: string;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export function CampaignSendModal({
  open,
  campaignId,
  campaignName,
  onClose,
  onStatusChanged,
}: CampaignSendModalProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<'preview' | 'progress'>('preview');
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);

  // Load preview when opened
  useEffect(() => {
    if (open && campaignId) {
      setStep('preview');
      setLoadingPreview(true);
      setPreview(null);
      setProgress(null);

      deliveryService
        .getPreview(campaignId)
        .then((p) => setPreview(p))
        .catch((error: unknown) => {
          const err = error as { response?: { data?: { error?: string } }; message?: string };
          toast.error(
            err.response?.data?.error || err.message || 'Failed to load campaign preview.'
          );
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [open, campaignId, toast]);

  // Poll progress when in progress step
  const fetchProgress = useCallback(async () => {
    if (!campaignId) return;
    try {
      const p = await deliveryService.getProgress(campaignId);
      setProgress(p);
      if (p.status === 'COMPLETED' || p.status === 'FAILED') {
        onStatusChanged?.();
      }
    } catch {
      // ignore poll errors
    }
  }, [campaignId, onStatusChanged]);

  useEffect(() => {
    if (open && step === 'progress' && campaignId) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 2000);
      return () => clearInterval(interval);
    }
  }, [open, step, campaignId, fetchProgress]);

  const handleConfirmSend = async () => {
    if (!campaignId) return;
    setStarting(true);
    try {
      const p = await deliveryService.startSending(campaignId);
      setProgress(p);
      setStep('progress');
      toast.success('Campaign queued and sending started!');
      onStatusChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to start campaign sending.');
    } finally {
      setStarting(false);
    }
  };

  const handlePause = async () => {
    if (!campaignId) return;
    setPausing(true);
    try {
      const p = await deliveryService.pauseSending(campaignId);
      setProgress(p);
      toast.info('Campaign sending paused.');
      onStatusChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to pause sending.');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    if (!campaignId) return;
    setStarting(true);
    try {
      const p = await deliveryService.resumeSending(campaignId);
      setProgress(p);
      toast.success('Campaign sending resumed.');
      onStatusChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to resume sending.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === 'preview'
          ? `Send Campaign: ${campaignName || 'Campaign'}`
          : `Sending Progress: ${campaignName || 'Campaign'}`
      }
      size="xl"
      persistent={step === 'progress' && progress?.status === 'SENDING'}
    >
      {/* ── STEP 1: PREVIEW ── */}
      {step === 'preview' && (
        <div className="space-y-5">
          <p className="text-sm text-[var(--content-secondary)]">
            Review how variables (like{' '}
            <code className="text-brand-400 font-mono text-xs">{'{{firstName}}'}</code> and{' '}
            <code className="text-brand-400 font-mono text-xs">{'{{company}}'}</code>) will be
            personalized for each lead before queueing emails.
          </p>

          {loadingPreview ? (
            <div className="p-8 text-center text-sm text-[var(--content-tertiary)]">
              Loading campaign preview & verifying lead data...
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Recipient & Metadata pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
                <div>
                  <span className="text-[var(--content-tertiary)]">Previewing for lead: </span>
                  <span className="font-semibold text-[var(--content-primary)]">
                    {preview.lead.name}
                  </span>{' '}
                  ({preview.lead.email})
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">
                    {preview.template}
                  </Badge>
                  <span className="text-[var(--content-tertiary)]">
                    Total Leads: <strong>{preview.totalLeads}</strong>
                  </span>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden bg-[var(--surface-card)]">
                <div className="p-4 border-b border-[var(--surface-border)] bg-[var(--surface-elevated)]">
                  <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                    Subject
                  </p>
                  <p className="text-sm font-semibold text-[var(--content-primary)] mt-0.5">
                    {preview.subject}
                  </p>
                </div>
                <div className="p-5 text-sm text-[var(--content-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                  {preview.htmlBody}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
                <Button variant="ghost" onClick={onClose} disabled={starting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmSend}
                  loading={starting}
                  disabled={starting}
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  }
                >
                  Confirm & Start Sending ({preview.totalLeads} emails)
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-red-400">
              Could not generate email preview. Ensure campaign has leads attached.
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: PROGRESS ── */}
      {step === 'progress' && (
        <div className="space-y-6 py-2">
          {/* Header Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-[var(--content-primary)]">
                Delivery Status:
              </span>
              <Badge
                variant={
                  progress?.status === 'SENDING'
                    ? 'info'
                    : progress?.status === 'PAUSED'
                      ? 'warning'
                      : progress?.status === 'COMPLETED'
                        ? 'success'
                        : 'error'
                }
                dot
              >
                {progress?.status === 'SENDING'
                  ? 'Sending in Progress...'
                  : progress?.status || 'Processing'}
              </Badge>
            </div>
            <span className="text-xs text-[var(--content-tertiary)]">
              Batch size: 20 emails / 3s
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--content-primary)]">
              <span>Progress</span>
              <span>{progress?.percentage ?? 0}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--surface-elevated)] overflow-hidden p-0.5 border border-[var(--surface-border)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue-400 transition-all duration-500"
                style={{ width: `${progress?.percentage ?? 0}%` }}
              />
            </div>
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-3 text-center">
              <p className="text-2xs font-semibold uppercase text-[var(--content-tertiary)]">
                Total Queue
              </p>
              <p className="text-2xl font-bold text-[var(--content-primary)] mt-1">
                {progress?.total ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center">
              <p className="text-2xs font-semibold uppercase text-green-400">Sent</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{progress?.sent ?? 0}</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center">
              <p className="text-2xs font-semibold uppercase text-red-400">Failed</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{progress?.failed ?? 0}</p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-center">
              <p className="text-2xs font-semibold uppercase text-blue-400">Remaining</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{progress?.pending ?? 0}</p>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
            {progress?.status === 'SENDING' && (
              <Button variant="outline" onClick={handlePause} loading={pausing} disabled={pausing}>
                Pause Sending
              </Button>
            )}
            {progress?.status === 'PAUSED' && (
              <Button
                variant="primary"
                onClick={handleResume}
                loading={starting}
                disabled={starting}
              >
                Resume Sending
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {progress?.status === 'COMPLETED' ? 'Done' : 'Close Progress View'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
