import { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../ui';
import { whatsappService } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';

interface WhatsappPreviewModalProps {
  open: boolean;
  leadId: string | null;
  leadName?: string;
  companyName?: string;
  phone?: string;
  campaignId?: string;
  onClose: () => void;
  onSent?: () => void;
}

const MAX_WA_CHARS = 1000;

export function WhatsappPreviewModal({
  open,
  leadId,
  leadName,
  companyName,
  phone,
  campaignId,
  onClose,
  onSent,
}: WhatsappPreviewModalProps) {
  const { toast } = useToast();

  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate or load message on open
  useEffect(() => {
    if (open && leadId) {
      setGenerating(true);
      setMessage('');

      whatsappService
        .generateMessage(leadId)
        .then((res) => {
          setMessage(res.message);
        })
        .catch((error: unknown) => {
          const err = error as { response?: { data?: { error?: string } }; message?: string };
          toast.error(
            err.response?.data?.error || err.message || 'Failed to generate AI WhatsApp message.'
          );
        })
        .finally(() => setGenerating(false));
    }
  }, [open, leadId, toast]);

  const handleRegenerate = async () => {
    if (!leadId) return;
    setGenerating(true);
    try {
      const res = await whatsappService.generateMessage(leadId);
      setMessage(res.message);
      toast.info('New WhatsApp message generated');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to regenerate message.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!leadId || !message.trim()) return;
    setSavingDraft(true);
    try {
      await whatsappService.saveDraft(leadId, message, campaignId);
      toast.success('WhatsApp message draft saved!');
    } catch {
      toast.error('Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!leadId || !message.trim() || sending) return;
    setSending(true);
    try {
      const res = await whatsappService.sendMessages({
        leadIds: [leadId],
        campaignId,
        message,
      });

      if (res && res.count > 0) {
        toast.success(`💬 ${res.message || 'WhatsApp message queued for delivery!'}`);
        onSent?.();
        onClose();
      } else {
        toast.error('Failed to queue WhatsApp message. Please check the recipient lead details.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to send WhatsApp message.');
    } finally {
      setSending(false);
    }
  };

  const charCount = message.length;
  const isOverLimit = charCount > MAX_WA_CHARS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`WhatsApp Preview: ${leadName || 'Lead'}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Recipient info pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
          <div>
            <span className="text-[var(--content-tertiary)]">Recipient: </span>
            <span className="font-semibold text-[var(--content-primary)]">{leadName}</span> (
            <span className="font-mono text-brand-400">{phone || 'No phone set'}</span>)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--content-tertiary)]">Company: </span>
            <Badge variant="brand" size="sm">
              {companyName || 'Lead Company'}
            </Badge>
          </div>
        </div>

        {/* Message Editor Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">WhatsApp Message</label>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-2xs ${
                  isOverLimit ? 'text-red-400 font-bold' : 'text-[var(--content-tertiary)]'
                }`}
              >
                {charCount} / {MAX_WA_CHARS} chars
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                loading={generating}
                disabled={generating || sending}
              >
                🔄 Regenerate
              </Button>
            </div>
          </div>

          <div className="relative rounded-xl border border-[var(--surface-border)] overflow-hidden bg-[#0b141a] p-4 text-green-100 shadow-inner min-h-[180px]">
            {generating ? (
              <div className="py-12 text-center text-xs text-emerald-400 animate-pulse">
                ✨ Generating personalized WhatsApp message with AI...
              </div>
            ) : (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder="Enter WhatsApp outreach message..."
                className="w-full bg-transparent text-sm font-sans focus:outline-none resize-none leading-relaxed text-emerald-100 placeholder-emerald-700/60"
              />
            )}
          </div>
          {isOverLimit && (
            <p className="text-2xs text-red-400">
              ⚠️ Warning: Messages over {MAX_WA_CHARS} characters may be truncated on mobile
              devices.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            loading={savingDraft}
            disabled={generating || sending}
          >
            Save Draft
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              loading={sending}
              disabled={generating || sending || isOverLimit || !message.trim()}
              leftIcon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                </svg>
              }
            >
              {sending ? 'Sending WhatsApp...' : 'Send WhatsApp'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
