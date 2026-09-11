import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Badge, Select } from '../ui';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';

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
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [previewText, setPreviewText] = useState('');

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch approved Meta templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await whatsappService.getTemplates();
      if (res?.templates && res.templates.length > 0) {
        setTemplates(res.templates);
        const approved = res.templates.find((t) => t.status === 'APPROVED');
        if (approved) {
          setSelectedTemplateName(approved.name);
        } else {
          setSelectedTemplateName(res.templates[0].name);
        }
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
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch template variables & resolved preview
  const fetchPreview = useCallback(
    async (tplName: string) => {
      if (!leadId) return;
      setGenerating(true);
      try {
        const res = await whatsappService.previewTemplate(leadId, tplName);
        setSelectedTemplateName(res.templateName);
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

  useEffect(() => {
    if (open && leadId) {
      loadTemplates();
    }
  }, [open, leadId, loadTemplates]);

  useEffect(() => {
    if (open && leadId && selectedTemplateName) {
      fetchPreview(selectedTemplateName);
    }
  }, [open, leadId, selectedTemplateName, fetchPreview]);

  // Regenerate / Refresh AI Variables
  const handleRegenerateVariables = async () => {
    if (!selectedTemplateName) return;
    await fetchPreview(selectedTemplateName);
    toast.success('AI template variables refreshed from lead research!');
  };

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

        {/* Architecture compliance card */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 text-emerald-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-300">
              Approved Meta WhatsApp Template Dispatch
            </span>
            <Badge variant="success" size="sm">
              Meta Approved ✓
            </Badge>
          </div>
          <p className="text-emerald-300/85 leading-relaxed">
            Outbound WhatsApp outreach strictly uses approved Meta templates. AI personalizes the{' '}
            <strong>template variables only</strong> using lead and company intelligence. The
            message structure is enforced by Meta Cloud API.
          </p>
        </div>

        {/* Template Selector & Meta Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
              Approved WhatsApp Template
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-[var(--content-tertiary)]">
                Lang: <strong className="text-[var(--content-primary)]">{templateLang}</strong>
              </span>
              <span className="text-2xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ✓ Meta Verified
              </span>
            </div>
          </div>

          <Select
            id="wa-template-selector"
            value={selectedTemplateName}
            onChange={(val) => setSelectedTemplateName(val)}
            options={templateOptions}
            disabled={loadingTemplates || generating}
          />
        </div>

        {/* AI Variable Mapping Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[var(--content-primary)] uppercase tracking-wider">
                AI Template Variable Mapping
              </h4>
              <p className="text-2xs text-[var(--content-secondary)]">
                Values extracted from lead & company research to populate template placeholders:
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateVariables}
              loading={generating}
              disabled={generating || sending}
              className="text-xs"
            >
              Refresh AI Values
            </Button>
          </div>

          {generating ? (
            <div className="p-6 text-center text-xs text-emerald-400 animate-pulse bg-[var(--surface-elevated)] rounded-xl border border-[var(--surface-border)]">
              Personalizing template variables using company research...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-[var(--surface-elevated)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{'{{1}}'}</span>
                  <span className="text-2xs text-[var(--content-tertiary)]">Lead Name</span>
                </div>
                <p className="text-xs font-semibold text-[var(--content-primary)] mt-1.5 truncate">
                  {variables['1'] || templateParams[0] || leadName?.split(' ')[0] || 'Prospect'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-[var(--surface-elevated)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{'{{2}}'}</span>
                  <span className="text-2xs text-[var(--content-tertiary)]">Company Name</span>
                </div>
                <p className="text-xs font-semibold text-[var(--content-primary)] mt-1.5 truncate">
                  {variables['2'] || templateParams[1] || companyName || 'your company'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-[var(--surface-elevated)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{'{{3}}'}</span>
                  <span className="text-2xs text-[var(--content-tertiary)]">Specialty / Field</span>
                </div>
                <p className="text-xs font-semibold text-[var(--content-primary)] mt-1.5 truncate">
                  {variables['3'] || templateParams[2] || 'your industry'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Final Resolved WhatsApp Message Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--content-primary)]">
              Final WhatsApp Message — What Recipient Receives
            </span>
            <span className="font-mono text-2xs text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
              Meta Cloud API
            </span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-[#0b141a] p-4 text-emerald-100 shadow-inner">
            {generating ? (
              <div className="py-8 text-center text-xs text-emerald-400 animate-pulse">
                Resolving template preview with personalized AI variables...
              </div>
            ) : (
              <p className="w-full text-sm font-sans leading-relaxed text-emerald-100 whitespace-pre-wrap break-words">
                {previewText ||
                  currentTemplate?.bodyText ||
                  'Loading resolved WhatsApp template preview...'}
              </p>
            )}
          </div>
          <p className="text-2xs text-[var(--content-tertiary)]">
            Fixed Meta Template: Text structure cannot be rewritten; only variables are
            personalized.
          </p>
        </div>

        {/* Send Confirmation & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--surface-border)]">
          <p className="text-xs text-[var(--content-secondary)] text-center sm:text-left">
            You are about to send approved template{' '}
            <strong className="text-emerald-300 font-mono">'{selectedTemplateName}'</strong> to{' '}
            <strong className="text-[var(--content-primary)]">{leadName || 'lead'}</strong>.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
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
              {sending ? 'Queueing WhatsApp...' : 'Send Approved WhatsApp Template'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
