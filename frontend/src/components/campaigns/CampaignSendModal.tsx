import { useState, useEffect } from 'react';
import { Modal, Button, Badge, Select } from '../ui';
import { deliveryService, CampaignPreview } from '../../services/delivery.service';
import { SendingSpeed } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';

interface CampaignSendModalProps {
  open: boolean;
  campaignId: string | null;
  campaignName?: string;
  onClose: () => void;
  onStatusChanged?: () => void;
}

const SPEED_OPTIONS = [
  { value: 'NORMAL', label: 'Normal (5 emails/sec - Recommended)' },
  { value: 'FAST', label: 'Fast (20 emails/sec - High capacity SMTP)' },
  { value: 'SLOW', label: 'Slow (1 email/sec - Rate-limited SMTP)' },
];

export function CampaignSendModal({
  open,
  campaignId,
  campaignName,
  onClose,
  onStatusChanged,
}: CampaignSendModalProps) {
  const { toast } = useToast();

  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [speed, setSpeed] = useState<SendingSpeed>('NORMAL');

  // Load preview when opened
  useEffect(() => {
    if (open && campaignId) {
      setLoadingPreview(true);
      setPreview(null);

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

  const handleConfirmSend = async () => {
    if (!campaignId || starting) return;
    setStarting(true);
    try {
      await deliveryService.startSending(campaignId);
      toast.success('✅ Campaign queued successfully. Emails will begin sending shortly.');
      onStatusChanged?.();
      onClose(); // Auto close dialog immediately per requirements
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to start campaign sending.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send Campaign: ${campaignName || 'Campaign'}`}
      size="xl"
    >
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

            {/* Speed Control Selector */}
            <div className="pt-2">
              <Select
                id="sending-speed"
                label="Delivery Speed Rate"
                value={speed}
                onChange={(val) => setSpeed(val as SendingSpeed)}
                options={SPEED_OPTIONS}
              />
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
                {starting
                  ? 'Preparing campaign...'
                  : `Confirm & Start Sending (${preview.totalLeads} emails)`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-red-400">
            Could not generate email preview. Ensure campaign has leads attached.
          </div>
        )}
      </div>
    </Modal>
  );
}
