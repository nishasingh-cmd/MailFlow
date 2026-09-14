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
          ? 'WhatsApp campaign queued! Dispatches will begin sending shortly.'
          : isMulti
            ? 'Multi-channel campaign queued! Email & WhatsApp dispatches will begin sending.'
            : 'Email campaign queued! Emails will begin sending shortly.'
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
      title={
        isWhatsappOnly
          ? `WhatsApp Campaign Dispatch: ${campaignName || 'Campaign'}`
          : isMultiChannel
            ? `Multi-Channel Outreach: ${campaignName || 'Campaign'}`
            : `Email Campaign Send: ${campaignName || 'Campaign'}`
      }
      size="xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-[var(--content-secondary)]">
          {isWhatsappOnly
            ? 'Review the approved Meta template, AI variable mapping, and resolved preview before dispatching.'
            : isMultiChannel
              ? 'Review personalized outreach details before queueing multi-channel messages (Email + WhatsApp).'
              : 'Review the AI-generated email subject and body before queueing emails for delivery.'}
        </p>

        {loadingPreview ? (
          <div className="p-8 text-center text-sm text-[var(--content-tertiary)]">
            Loading campaign preview & verifying lead data...
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
              <span>
                Total Leads:{' '}
                <strong className="text-[var(--content-primary)] font-bold">
                  {preview.totalLeads}
                </strong>
              </span>
            </div>

            {isWhatsappOnly ? (
              <div className="space-y-3">
                {/* WHATSAPP ARCHITECTURE REVIEW CARD */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 text-emerald-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-sm">
                      WhatsApp Campaign Review
                    </span>
                    <Badge variant="success" size="sm">
                      Meta Status: Approved ✓
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs pt-1 border-t border-emerald-500/20">
                    <div>
                      <span className="text-emerald-400/80 block">Template:</span>
                      <strong className="font-mono text-emerald-200">
                        {preview.whatsappPreview?.templateName ||
                          preview.template ||
                          'cold_outreach'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-400/80 block">Language:</span>
                      <strong className="text-emerald-200">
                        {preview.whatsappPreview?.templateLang || 'en'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-400/80 block">Delivery Pipeline:</span>
                      <strong className="text-emerald-200">Meta Cloud API</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 text-emerald-300/90 leading-relaxed">
                    ✓ <strong>AI Personalization:</strong> Template variables generated based on
                    lead & company research. The approved template defines the actual message
                    structure.
                  </div>
                </div>

                {/* VARIABLE MAPPING DISPLAY */}
                {preview.whatsappPreview?.variables && (
                  <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] space-y-1.5">
                    <span className="text-2xs font-semibold uppercase text-[var(--content-tertiary)] block">
                      Resolved Template Variables:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      {Object.entries(preview.whatsappPreview.variables).map(([key, val]) => (
                        <span
                          key={key}
                          className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/25"
                        >
                          {'{{' + key + '}}'} ={' '}
                          <strong className="font-sans font-medium text-white">{val}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* FINAL WHATSAPP RESOLVED MESSAGE */}
                <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-[var(--surface-card)]">
                  <div className="p-3 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-300">
                        Preview — This is what the recipient will receive on WhatsApp
                      </span>
                    </div>
                    <span className="text-2xs text-emerald-400 font-mono">Meta Verified</span>
                  </div>
                  <div className="p-4 text-sm text-emerald-100 whitespace-pre-wrap font-sans leading-relaxed bg-[#0b141a]">
                    {preview.whatsappPreview?.previewText ||
                      `Hello ${preview.lead.name.split(' ')[0]},\n\nI came across ${preview.lead.company || 'your company'} and noticed your work in ${preview.lead.industry || 'your field'}.\n\nI’m reaching out from MailFlow. We help practices build a stronger digital presence and improve outreach.\n\nWould you be available for a brief conversation this week?`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
              </div>
            )}

            {isMultiChannel && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-200 text-xs flex items-center gap-2">
                <span>
                  <strong>WhatsApp Enabled:</strong> Approved Meta WhatsApp template dispatches will
                  also be queued simultaneously for all target leads with valid phone numbers.
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

            {/* CONFIRMATION STATEMENT & BUTTONS */}
            <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
              <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
                {isWhatsappOnly ? (
                  <p>
                    You are about to send the approved Meta WhatsApp template{' '}
                    <strong className="text-emerald-300 font-mono">
                      '
                      {preview.whatsappPreview?.templateName || preview.template || 'cold_outreach'}
                      '
                    </strong>{' '}
                    to <strong>{preview.totalLeads}</strong> leads via Meta Cloud API.
                  </p>
                ) : isMultiChannel ? (
                  <p>
                    You are about to send personalized emails and approved Meta WhatsApp templates
                    to <strong>{preview.totalLeads}</strong> leads.
                  </p>
                ) : (
                  <p>
                    You are about to send personalized emails to{' '}
                    <strong>{preview.totalLeads}</strong> leads.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
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
                      ? `Send WhatsApp Campaign (${preview.totalLeads} Leads)`
                      : isMultiChannel
                        ? `Send Multi-Channel Campaign (${preview.totalLeads} Leads)`
                        : `Send Email Campaign (${preview.totalLeads} Leads)`}
                </Button>
              </div>
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
