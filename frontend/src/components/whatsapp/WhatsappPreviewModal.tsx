import { useState, useEffect, useCallback, useRef } from 'react';

import { Modal, Button, Badge, Select } from '../ui';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';
import { WhatsappChatPreview } from './WhatsappChatPreview';

interface WhatsappPreviewModalProps {
  open: boolean;
  leadId: string | null;
  leadName?: string;
  companyName?: string;
  phone?: string;
  campaignId?: string;
  lastInboundMessageAt?: string | null;
  onClose: () => void;
  onSent?: () => void;
}

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

  // Template state
  const [templates, setTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('cold_outreach');
  const [templateLang, setTemplateLang] = useState('en');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [, setVariables] = useState<Record<string, string>>({});
  const [previewText, setPreviewText] = useState('');

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Track the last lead+template pair we fetched preview for —
  // prevents the loadTemplates→setSelectedTemplateName→fetchPreview cascade.
  const lastFetchedRef = useRef<string>('');
  // Tracks whether we already bootstrapped for the current open session.
  const sessionRef = useRef<string>('');

  // Fetch template variables & resolved preview
  const fetchPreview = useCallback(
    async (tplName: string) => {
      if (!leadId || !tplName) return;
      const key = `${leadId}::${tplName}`;
      if (lastFetchedRef.current === key) return; // already fetched this combo
      lastFetchedRef.current = key;
      setGenerating(true);
      try {
        const res = await whatsappService.previewTemplate(leadId, tplName);
        // Do NOT call setSelectedTemplateName here — it would re-trigger this effect
        setTemplateLang(res.templateLang);
        setTemplateParams(res.templateParams || []);
        setVariables(res.variables || {});
        setPreviewText(res.previewText || '');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        toast.error(
          err.response?.data?.error || err.message || 'Failed to load template variable preview.'
        );
      } finally {
        setGenerating(false);
      }
    },
    [leadId, toast]
  );

  // Fetch approved Meta templates — runs once per (open+leadId) session
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await whatsappService.getTemplates();
      if (res?.templates && res.templates.length > 0) {
        setTemplates(res.templates);
        const approved = res.templates.find((t) => t.status === 'APPROVED');
        const name = approved ? approved.name : res.templates[0].name;
        setSelectedTemplateName(name);
        // Kick off preview immediately with the resolved name — avoids a second render cycle
        fetchPreview(name);
      } else {
        const fallback: WhatsappMetaTemplate = {
          name: 'cold_outreach',
          language: 'en',
          status: 'APPROVED',
          bodyText:
            "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!",
        };
        setTemplates([fallback]);
        setSelectedTemplateName('cold_outreach');
        fetchPreview('cold_outreach');
      }
    } catch {
      const fallback: WhatsappMetaTemplate = {
        name: 'cold_outreach',
        language: 'en',
        status: 'APPROVED',
        bodyText:
          "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!",
      };
      setTemplates([fallback]);
      setSelectedTemplateName('cold_outreach');
      fetchPreview('cold_outreach');
    } finally {
      setLoadingTemplates(false);
    }
  }, [fetchPreview]);

  // Bootstrap once per open+leadId session
  useEffect(() => {
    const sessionKey = `${open}::${leadId}`;
    if (open && leadId && sessionRef.current !== sessionKey) {
      sessionRef.current = sessionKey;
      lastFetchedRef.current = ''; // reset so new session re-fetches
      loadTemplates();
    }
    if (!open) {
      // Reset on close so next open starts fresh
      sessionRef.current = '';
      lastFetchedRef.current = '';
      setPreviewText('');
      setTemplates([]);
    }
  }, [open, leadId, loadTemplates]);

  // When user manually changes the template dropdown, fetch new preview
  const handleTemplateChange = useCallback(
    (val: string) => {
      setSelectedTemplateName(val);
      lastFetchedRef.current = ''; // allow re-fetch for new name
      fetchPreview(val);
    },
    [fetchPreview]
  );

  // Send approved template via Meta Cloud API
  const handleSend = async () => {
    if (!leadId || sending || !selectedTemplateName) return;
    setSending(true);
    try {
      const res = await whatsappService.sendMessages({
        leadIds: [leadId],
        campaignId,
        templateName: selectedTemplateName,
        templateParams,
      });

      if (res && res.count > 0) {
        toast.success(
          res.message || `Approved Meta template '${selectedTemplateName}' queued for delivery!`
        );
        onSent?.();
        onClose();
      } else {
        toast.error('Failed to queue WhatsApp template. Please verify recipient phone number.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to send WhatsApp template.');
    } finally {
      setSending(false);
    }
  };

  const currentTemplate = templates.find((t) => t.name === selectedTemplateName) || templates[0];

  const templateOptions = templates.map((t) => ({
    value: t.name,
    label: `${t.name} (Meta Status: ✓ ${t.status}, Lang: ${t.language})`,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WhatsApp Outreach — Approved Meta Template"
      size="lg"
    >
      <div className="space-y-5">
        {/* Recipient lead context */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-secondary)]">
          <div>
            <span className="text-[var(--content-tertiary)]">Recipient: </span>
            <span className="font-semibold text-[var(--content-primary)]">
              {leadName || 'Lead'}
            </span>{' '}
            (<span className="font-mono text-emerald-400">{phone || 'No phone set'}</span>)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--content-tertiary)]">Company: </span>
            <Badge variant="brand" size="sm">
              {companyName || 'Lead Company'}
            </Badge>
          </div>
        </div>

        {/* Template Selector & Meta Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
              Approved WhatsApp Template
            </label>
            <span className="text-2xs text-[var(--content-tertiary)]">
              Lang: <strong className="text-[var(--content-primary)]">{templateLang}</strong>
            </span>
          </div>

          <Select
            id="wa-template-selector"
            value={selectedTemplateName}
            onChange={handleTemplateChange}
            options={templateOptions}
            disabled={loadingTemplates || generating}
          />
        </div>

        {/* Final Resolved WhatsApp Message Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--content-primary)]">
              Final WhatsApp Message — What Recipient Receives
            </span>
          </div>

          {/* Always keep WhatsappChatPreview mounted — use an overlay for loading
              so the layout never blanks out, eliminating the flicker */}
          <div className="relative">
            <WhatsappChatPreview
              body={
                previewText ||
                currentTemplate?.bodyText ||
                'Loading resolved WhatsApp template preview...'
              }
            />
            {generating && (
              <div className="absolute inset-0 rounded-xl bg-[#0b141a]/70 flex items-center justify-center pointer-events-none">
                <span className="text-2xs text-emerald-400 animate-pulse">
                  Resolving variables...
                </span>
              </div>
            )}
          </div>
          <p className="text-2xs text-[var(--content-tertiary)]">
            Fixed Meta Template: Text structure cannot be rewritten; only variables are
            personalized.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={generating || sending || !selectedTemplateName || !phone}
            leftIcon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
            }
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
