import { useState, useEffect } from 'react';
import { Modal, Button, Select } from '../ui';
import { deliveryService, CampaignPreview } from '../../services/delivery.service';
import { SendingSpeed } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

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

function renderAnalyzedMessage(
  templateText: string,
  variables: Record<string, string>,
  previewText?: string
) {
  if (/\{\{\s*\d+\s*\}\}/.test(templateText)) {
    const parts = templateText.split(/(\{\{\s*\d+\s*\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/\{\{\s*(\d+)\s*\}\}/);
      if (match) {
        const varNum = match[1];
        const val = variables[varNum] || `{{${varNum}}}`;
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-xs font-sans bg-[#800000]/10 dark:bg-[#800000]/25 text-[#800000] dark:text-[#ffb3ba] border border-[#800000]/30 dark:border-[#800000]/50 mx-0.5 align-baseline"
            title={`Analyzed token {{${varNum}}}`}
          >
            {val}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }

  const textToRender = previewText || templateText;
  const valuesToHighlight = Object.values(variables).filter((v) => v && v.trim().length > 1);

  if (valuesToHighlight.length === 0) {
    return <span>{textToRender}</span>;
  }

  const pattern = new RegExp(
    `(${valuesToHighlight.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g'
  );

  const parts = textToRender.split(pattern);
  return parts.map((part, index) => {
    if (valuesToHighlight.includes(part)) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-xs font-sans bg-[#800000]/10 dark:bg-[#800000]/25 text-[#800000] dark:text-[#ffb3ba] border border-[#800000]/30 dark:border-[#800000]/50 mx-0.5 align-baseline"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

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
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loadingLeadPreview, setLoadingLeadPreview] = useState(false);
  const [channelTab, setChannelTab] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [starting, setStarting] = useState(false);
  const [speed, setSpeed] = useState<SendingSpeed>('NORMAL');

  useEffect(() => {
    if (open && campaignId) {
      setLoadingPreview(true);
      setPreview(null);
      setSelectedLeadId(null);
      setChannelTab('EMAIL');

      deliveryService
        .getPreview(campaignId)
        .then((p) => {
          setPreview(p);
          if (p.lead?.id) setSelectedLeadId(p.lead.id);
        })
        .catch((error: unknown) => {
          const err = error as { response?: { data?: { error?: string } }; message?: string };
          toast.error(
            err.response?.data?.error || err.message || 'Failed to load campaign preview.'
          );
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [open, campaignId, toast]);

  const handleSelectLead = async (newLeadId: string) => {
    if (!campaignId || newLeadId === selectedLeadId) return;
    setSelectedLeadId(newLeadId);
    setLoadingLeadPreview(true);
    try {
      const p = await deliveryService.getPreview(campaignId, newLeadId);
      setPreview(p);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        error.response?.data?.error || error.message || 'Failed to update preview for lead.'
      );
    } finally {
      setLoadingLeadPreview(false);
    }
  };

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
  const activeView = isWhatsappOnly ? 'WHATSAPP' : isMultiChannel ? channelTab : 'EMAIL';

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
              <div className="flex items-center gap-2">
                <span>
                  Total Leads:{' '}
                  <strong className="text-[var(--content-primary)] font-bold">
                    {preview.totalLeads}
                  </strong>
                </span>
              </div>

              {/* Lead Selector Dropdown to check message of any lead */}
              {preview.leads && preview.leads.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="campaign-preview-lead-select"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
                  >
                    Preview Lead:
                  </label>
                  <select
                    id="campaign-preview-lead-select"
                    value={selectedLeadId || preview.lead?.id}
                    onChange={(e) => handleSelectLead(e.target.value)}
                    disabled={loadingLeadPreview}
                    className="text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1.5 max-w-[260px] truncate focus:ring-1 focus:ring-brand-500 focus:outline-none cursor-pointer"
                  >
                    {preview.leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.company ? `(${l.company})` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingLeadPreview && (
                    <span className="text-2xs text-brand-500 font-semibold animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* MULTI-CHANNEL CHANNEL SELECTOR TABS */}
            {isMultiChannel && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setChannelTab('EMAIL')}
                    className={cn(
                      'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      channelTab === 'EMAIL'
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Email Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannelTab('WHATSAPP')}
                    className={cn(
                      'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      channelTab === 'WHATSAPP'
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>WhatsApp Preview</span>
                  </button>
                </div>
                <span className="text-2xs text-[var(--content-tertiary)] px-2">
                  Previewing for {preview.lead?.name || 'Lead'}
                </span>
              </div>
            )}

            {activeView === 'WHATSAPP' ? (
              <div
                className={cn('space-y-2.5 transition-opacity', loadingLeadPreview && 'opacity-50')}
              >
                {/* Header bar matching WhatsApp Message Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      WhatsApp Message Preview
                    </span>
                    {loadingLeadPreview && (
                      <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        Analyzing lead data...
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {preview.lead?.name
                      ? `Analyzed for: ${preview.lead.name} ${preview.lead.company ? `(${preview.lead.company})` : ''}`
                      : 'Prospect Data Analyzed'}
                  </span>
                </div>

                {/* Authentic WhatsApp Chat Preview */}
                <div
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] p-4 sm:p-6 flex flex-col items-center justify-center relative shadow-inner"
                  style={{
                    backgroundImage: `radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)`,
                    backgroundSize: '16px 16px',
                  }}
                >
                  <div className="max-w-xl w-full bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-sm border border-slate-200/60 dark:border-white/5 space-y-2.5 text-left">
                    {/* Formatted body message with analyzed pills */}
                    <div className="text-[13.5px] text-[#111b21] dark:text-[#d1d7db] leading-[22px] whitespace-pre-wrap break-words font-sans">
                      {renderAnalyzedMessage(
                        preview.whatsappPreview?.bodyText ||
                          preview.whatsappPreview?.previewText ||
                          `Hi {{1}}, this is {{2}} from {{3}}.\n\nI came across your work and thought there might be a good fit with what we offer. Would you be open to a quick chat this week?\n\nReply STOP to opt out.`,
                        preview.whatsappPreview?.variables || {},
                        preview.whatsappPreview?.previewText
                      )}
                    </div>

                    {/* WhatsApp Timestamp & Blue Double Checkmark */}
                    <div className="flex items-center justify-end gap-1 text-[11px] text-[#667781] dark:text-[#8696a0] pt-1 select-none">
                      <span>10:42 AM</span>
                      <svg
                        className="w-4 h-3.5 text-[#53bdeb]"
                        viewBox="0 0 16 11"
                        fill="currentColor"
                      >
                        <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={cn(
                    'rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-[var(--surface-card)] transition-opacity',
                    loadingLeadPreview && 'opacity-50'
                  )}
                >
                  <div className="p-4 border-b border-slate-300 dark:border-slate-700 bg-[var(--surface-elevated)] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-2xs uppercase font-semibold text-[var(--content-tertiary)]">
                        Subject
                      </p>
                      <p className="text-sm font-semibold text-[var(--content-primary)] mt-0.5">
                        {preview.subject}
                      </p>
                    </div>
                    {preview.lead && (
                      <div className="text-right">
                        <span className="text-2xs text-slate-500 uppercase tracking-wider block">
                          Previewing Lead
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {preview.lead.name}{' '}
                          {preview.lead.company ? `(${preview.lead.company})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 text-sm text-[var(--content-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                    {preview.htmlBody}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Select
                id="sending-speed"
                label="Delivery Speed Rate"
                value={speed}
                onChange={(val) => setSpeed(val as SendingSpeed)}
                options={SPEED_OPTIONS}
                triggerClassName="border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* CONFIRMATION STATEMENT & BUTTONS */}
            <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
              <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
                {isWhatsappOnly ? (
                  <p>
                    You are about to send the approved Meta WhatsApp template{' '}
                    <strong className="text-brand-300 font-mono">
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
