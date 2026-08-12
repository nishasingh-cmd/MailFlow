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
  { value: 'NORMAL', label: 'Normal (5 dispatches/sec - Recommended)' },
  { value: 'FAST', label: 'Fast (20 dispatches/sec)' },
  { value: 'SLOW', label: 'Slow (1 dispatch/sec)' },
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
      const isWa = preview?.channel === 'WHATSAPP';
      const isMulti = preview?.channel === 'EMAIL_AND_WHATSAPP';
      toast.success(
        isWa
          ? '💬 WhatsApp campaign queued! Dispatches will begin sending shortly.'
          : isMulti
            ? '🚀 Multi-channel campaign queued! Email & WhatsApp dispatches will begin sending.'
            : '✉️ Email campaign queued! Emails will begin sending shortly.'
      );
      onStatusChanged?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to start campaign sending.');
    } finally {
      setStarting(false);
    }
  };

  const channel = preview?.channel || 'EMAIL';
  const isWhatsappOnly = channel === 'WHATSAPP';
  const isMultiChannel = channel === 'EMAIL_AND_WHATSAPP';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send Campaign: ${campaignName || 'Campaign'}`}
      size="xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-[var(--content-secondary)]">
          {isWhatsappOnly
            ? 'Review recipient lead data and delivery speed before launching WhatsApp outreach dispatches.'
            : isMultiChannel
              ? 'Review personalized outreach details before queueing multi-channel messages (Email + WhatsApp).'
              : 'Review how variables will be personalized for each lead before queueing emails.'}
        </p>

        {loadingPreview ? (
          <div className="p-8 text-center text-sm text-[var(--content-tertiary)]">
            Loading campaign preview & verifying lead data...
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
              <div>
                <span className="text-[var(--content-tertiary)]">Previewing for lead: </span>
                <span className="font-semibold text-[var(--content-primary)]">
                  {preview.lead.name}
                </span>{' '}
                ({isWhatsappOnly ? preview.lead.phone || 'No phone' : preview.lead.email})
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isWhatsappOnly ? 'success' : isMultiChannel ? 'warning' : 'brand'}
                  size="sm"
                >
                  {isWhatsappOnly
                    ? '📱 WhatsApp Only'
                    : isMultiChannel
                      ? '⚡ Email + WhatsApp'
                      : '✉️ Email Only'}
                </Badge>
                <span className="text-[var(--content-tertiary)]">
                  Total Leads: <strong>{preview.totalLeads}</strong>
                </span>
              </div>
            </div>

            {isWhatsappOnly ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 text-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-300">
                      <span>💬</span> AI Personalized WhatsApp Template Dispatch
                    </span>
                    <Badge variant="success" size="sm">
                      Meta Cloud API (Lang: en)
                    </Badge>
                  </div>
                  <p className="text-emerald-300/80 leading-relaxed">
                    Outbound WhatsApp messages will be sent via Meta Cloud API using your
                    pre-approved{' '}
                    <code className="font-mono text-emerald-200 bg-emerald-500/20 px-1 rounded">
                      {preview.whatsappPreview?.templateName || 'cold_outreach'}
                    </code>{' '}
                    template. Each lead receives custom AI-extracted variables based on company
                    research.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-[var(--surface-card)]">
                  <div className="p-3.5 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💬</span>
                      <span className="text-xs font-semibold text-emerald-300">
                        Resolved Message Preview for {preview.lead.name}
                      </span>
                    </div>
                    {preview.whatsappPreview?.variables && (
                      <div className="flex items-center gap-1.5 text-2xs font-mono text-emerald-300/90">
                        <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {'{{1}}'} = {preview.whatsappPreview.variables['1']}
                        </span>
                        <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {'{{2}}'} = {preview.whatsappPreview.variables['2']}
                        </span>
                        <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {'{{3}}'} = {preview.whatsappPreview.variables['3']}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 text-sm text-[var(--content-primary)] whitespace-pre-wrap font-sans leading-relaxed bg-[var(--surface-elevated)]">
                    {preview.whatsappPreview?.previewText ||
                      `Hello ${preview.lead.name.split(' ')[0]},\n\nI came across ${preview.lead.company || 'your company'} and noticed your work in ${preview.lead.industry || 'your field'}.\n\nI’m reaching out from MailFlow. We help practices build a stronger digital presence and improve outreach.\n\nWould you be available for a brief conversation this week?`}
                  </div>
                </div>
              </div>
            ) : (
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
            )}

            {isMultiChannel && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-200 text-xs flex items-center gap-2">
                <span>💬</span>
                <span>
                  <strong>WhatsApp Enabled:</strong> WhatsApp dispatches will also be queued
                  simultaneously for all target leads with valid phone numbers.
                </span>
              </div>
            )}

            <div className="pt-2">
              <Select
                id="sending-speed"
                label="Delivery Speed Rate"
                value={speed}
                onChange={(val) => setSpeed(val as SendingSpeed)}
                options={SPEED_OPTIONS}
              />
            </div>

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
                  : isWhatsappOnly
                    ? `Confirm & Start Sending (${preview.totalLeads} WhatsApp dispatches)`
                    : isMultiChannel
                      ? `Confirm & Start Sending (${preview.totalLeads} Email + WhatsApp dispatches)`
                      : `Confirm & Start Sending (${preview.totalLeads} emails)`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-red-400">
            Could not generate campaign preview. Ensure campaign has leads attached.
          </div>
        )}
      </div>
    </Modal>
  );
}
