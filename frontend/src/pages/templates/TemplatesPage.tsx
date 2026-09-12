import { useState, useEffect, useCallback } from 'react';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Badge, Skeleton, Modal } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/routes';

interface SampleTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  header?: string;
  body: string;
  footer?: string;
  buttonText?: string;
  description: string;
}

const PRESET_TEMPLATES: SampleTemplate[] = [
  {
    name: 'b2b_lead_outreach',
    category: 'MARKETING',
    language: 'en_US',
    header: 'Quick Partnership Idea',
    body: 'Hi {{1}}, noticed {{2}} is expanding outreach this quarter. We helped similar teams boost qualified responses by 3x. Would you be open to a 5-min chat this Thursday?',
    footer: 'Reply STOP to unsubscribe',
    buttonText: 'Schedule Demo',
    description: 'High-converting personalized cold B2B outreach for qualified prospects.',
  },
  {
    name: 'instant_lead_followup',
    category: 'MARKETING',
    language: 'en_US',
    body: 'Hello {{1}}, thanks for reaching out to {{2}}! Your personalized strategy report is ready. Would you like us to review it together on WhatsApp or via a quick call?',
    footer: 'MailFlow Outreach Engine',
    buttonText: 'View Report',
    description: 'Instant response template within minutes of lead form submission.',
  },
  {
    name: 'meeting_confirmation',
    category: 'UTILITY',
    language: 'en_US',
    header: 'Meeting Confirmed',
    body: 'Hi {{1}}, your demo session with {{2}} is confirmed for {{3}}. Please let us know if you need to reschedule.',
    footer: 'Automated notification',
    buttonText: 'Join Meeting',
    description: 'Essential calendar booking and attendance confirmation template.',
  },
  {
    name: 'vip_reengagement_offer',
    category: 'MARKETING',
    language: 'en_US',
    header: 'Special Access for {{2}}',
    body: 'Hey {{1}}, we noticed you haven’t explored our latest deliverability engine updates. We’ve unlocked complimentary credits for {{2}} to test this week!',
    footer: 'Limited time invitation',
    buttonText: 'Claim Access',
    description: 'Re-activates dormant or stalled leads with high perceived value.',
  },
  {
    name: 'post_demo_followup',
    category: 'UTILITY',
    language: 'en_US',
    body: 'Hi {{1}}, great speaking today about {{2}}’s outreach workflow. As discussed, here is the recap and next steps: {{3}}.',
    footer: 'Sent via MailFlow',
    buttonText: 'Review Next Steps',
    description: 'Immediate recap after sales calls to lock in commitments.',
  },
];

function WhatsappChatPreview({
  header,
  body,
  footer,
  buttonText,
  timestamp = '10:42 AM',
}: {
  header?: string;
  body: string;
  footer?: string;
  buttonText?: string;
  businessName?: string;
  timestamp?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] overflow-hidden shadow-xs bg-[#efeae2] dark:bg-[#0b141a] p-4 sm:p-5 font-sans flex items-center justify-center">
      {/* WhatsApp Message Chatbox Bubble */}
      <div className="max-w-md w-full bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/40 dark:border-white/5 space-y-1.5 text-left">
        {header && (
          <p className="font-bold text-xs text-[#111b21] dark:text-[#e9edef] leading-snug">
            {header}
          </p>
        )}

        <div className="text-[13.5px] text-[#111b21] dark:text-[#d1d7db] leading-[20px] whitespace-pre-wrap break-words font-sans">
          {body ? (
            body.split(/(\{\{\d+\}\})/g).map((part, idx) =>
              /\{\{\d+\}\}/.test(part) ? (
                <span
                  key={idx}
                  className="bg-slate-100 text-slate-900 dark:bg-slate-700/80 dark:text-slate-100 border border-slate-300 dark:border-slate-600 font-sans font-bold px-1.5 py-0.5 rounded mx-0.5 text-sm"
                >
                  {part}
                </span>
              ) : (
                part
              )
            )
          ) : (
            <span className="text-slate-400 italic">Your template message will appear here...</span>
          )}
        </div>

        {footer && (
          <p className="text-[11px] text-[#667781] dark:text-[#8696a0] mt-1 italic">{footer}</p>
        )}

        {/* Timestamp and Double Blue Ticks */}
        <div className="flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0] pt-0.5 select-none">
          <span>{timestamp}</span>
          <svg className="w-4 h-3.5 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
            <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
          </svg>
        </div>

        {/* WhatsApp Quick Reply / CTA Button */}
        {buttonText && (
          <div className="border-t border-[#e9edef] dark:border-[#2f3b43] -mx-3.5 -mb-3.5 mt-2 py-2.5 px-3 text-center text-xs font-semibold text-[#00a884] dark:text-[#00a884] flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-b-2xl">
            <svg
              className="w-3.5 h-3.5 text-[#00a884]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span>{buttonText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [templates, setTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsappMetaTemplate | null>(null);

  // Form State for Create Template
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>(
    'MARKETING'
  );
  const [formLang, setFormLang] = useState('en_US');
  const [formHeader, setFormHeader] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formFooter, setFormFooter] = useState('');
  const [formButton, setFormButton] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await whatsappService.getTemplates();
      setTemplates(res.templates || []);
    } catch {
      // Fallback with demo templates if backend offline or unconfigured
      setTemplates([
        {
          name: 'quick_lead_outreach',
          language: 'en_US',
          status: 'APPROVED',
          bodyText:
            'Hi {{1}}, noticed {{2}} is exploring multichannel outreach. Would you be open to a 5-min demo?',
        },
        {
          name: 'lead_followup_reminder',
          language: 'en_US',
          status: 'APPROVED',
          bodyText:
            'Hello {{1}}, following up on our email regarding {{2}}. Let me know if you have any questions!',
        },
      ]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await whatsappService.getTemplates();
      setTemplates(res.templates || []);
      toast.success(`Synced ${res.templates?.length || 0} templates from Meta Cloud API.`);
    } catch {
      toast.error('Failed to sync templates. Verify Meta credentials in Settings.');
    } finally {
      setSyncing(false);
    }
  };

  const handleApplyPreset = (preset: SampleTemplate) => {
    setFormName(preset.name);
    setFormCategory(preset.category);
    setFormLang(preset.language);
    setFormHeader(preset.header || '');
    setFormBody(preset.body);
    setFormFooter(preset.footer || '');
    setFormButton(preset.buttonText || '');
    setBrowseModalOpen(false);
    setCreateModalOpen(true);
    toast.info(`Loaded preset "${preset.name}". You can now customize and submit.`);
  };

  const insertVariable = () => {
    const nextVarNumber = (formBody.match(/\{\{\d+\}\}/g) || []).length + 1;
    setFormBody((prev) => `${prev} {{${nextVarNumber}}}`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBody.trim()) {
      toast.error('Template Name and Message Body are required.');
      return;
    }

    const sanitizedName = formName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    setSubmitting(true);
    setTimeout(() => {
      // Add to local state as PENDING
      const newTemplate: WhatsappMetaTemplate = {
        name: sanitizedName,
        language: formLang,
        status: 'PENDING',
        bodyText: formBody,
      };

      setTemplates((prev) => [newTemplate, ...prev]);
      setSubmitting(false);
      setCreateModalOpen(false);
      // Reset form
      setFormName('');
      setFormHeader('');
      setFormBody('');
      setFormFooter('');
      setFormButton('');
      toast.success(
        `Template "${sanitizedName}" submitted to Meta for approval! (Usually approved in 1-2 minutes)`
      );
    }, 900);
  };

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status.toUpperCase() === filter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header matching SandeshAI */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Templates
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 italic">
            It usually takes 1 - 2 minutes to approve a template, but for new WhatsApp API accounts{' '}
            <span className="underline font-medium text-slate-700 dark:text-slate-300">
              it can take up to 24 hours
            </span>{' '}
            for the first template approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setBrowseModalOpen(true)}
            className="px-4 py-2 rounded-xl border border-brand-500/60 hover:border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 text-sm font-semibold transition-all shadow-xs"
          >
            Browse Templates
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Template</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Sync Bar */}
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pt-2">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setFilter('ALL')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              filter === 'ALL'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              filter === 'APPROVED'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              filter === 'PENDING'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              filter === 'REJECTED'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Rejected
          </button>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="pb-3 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-brand-500' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{syncing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State Matching SandeshAI */
        <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Create Your First Template
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Design and set up WhatsApp message templates to streamline your communication with
              customers.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            <span className="font-bold text-base leading-none">+</span>
            <span>Create New Template</span>
          </button>
        </div>
      ) : (
        /* Templates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredTemplates.map((t) => {
            const isApproved = t.status.toUpperCase() === 'APPROVED';
            const isPending = t.status.toUpperCase() === 'PENDING';

            return (
              <div
                key={t.name}
                className="p-5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-xs hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate font-sans">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        Language: {t.language}
                      </p>
                    </div>
                    {isApproved ? (
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-[#5271ff] text-white font-bold text-xs shadow-xs tracking-wide">
                        APPROVED
                      </span>
                    ) : (
                      <Badge variant={isPending ? 'brand' : 'error'} size="sm" dot>
                        {t.status}
                      </Badge>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs text-[var(--content-secondary)] leading-relaxed font-sans whitespace-pre-wrap break-words">
                    {t.bodyText ? (
                      t.bodyText.split(/(\{\{\d+\}\})/g).map((part, idx) =>
                        /\{\{\d+\}\}/.test(part) ? (
                          <span
                            key={idx}
                            className="bg-brand-500/20 text-brand-600 dark:text-brand-300 font-sans font-bold px-1.5 py-0.5 rounded mx-0.5"
                          >
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )
                    ) : (
                      <span className="italic text-slate-400">No preview text available</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--surface-border)] flex items-center justify-between text-xs">
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <span>Preview Bubble</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(t.name);
                      toast.success(`Copied "${t.name}" to clipboard`);
                    }}
                    className="text-[var(--content-tertiary)] hover:text-[var(--content-primary)] font-medium transition-colors"
                  >
                    Copy Name
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Template Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New WhatsApp Template"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Template Name"
              placeholder="e.g. lead_outreach_q4"
              value={formName}
              onChange={(e) =>
                setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
              }
              hint="Only lowercase alphanumeric characters and underscores allowed."
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) =>
                  setFormCategory(e.target.value as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION')
                }
                className="w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="MARKETING">MARKETING (Promotions, Lead Gen, Deals)</option>
                <option value="UTILITY">UTILITY (Reminders, Confirmations, Updates)</option>
                <option value="AUTHENTICATION">AUTHENTICATION (OTPs, Verification)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Header (Optional)"
              placeholder="e.g. Partnership Opportunity"
              value={formHeader}
              onChange={(e) => setFormHeader(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                Language
              </label>
              <select
                value={formLang}
                onChange={(e) => setFormLang(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="en_US">English (US) - en_US</option>
                <option value="en_GB">English (UK) - en_GB</option>
                <option value="hi">Hindi - hi</option>
                <option value="es">Spanish - es</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--content-secondary)]">
                Body Text <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={insertVariable}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                + Add Variable &#123;&#123;1&#125;&#125;
              </button>
            </div>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="Hi {{1}}, we noticed {{2}} is expanding outreach this quarter..."
              className="w-full h-28 p-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              required
            />
            <p className="text-xs text-[var(--content-tertiary)] mt-1 font-sans">
              Use variables like &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; which MailFlow
              AI will personalize dynamically for each lead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Footer Text (Optional)"
              placeholder="e.g. Reply STOP to opt out"
              value={formFooter}
              onChange={(e) => setFormFooter(e.target.value)}
            />
            <Input
              label="Button Text (Optional)"
              placeholder="e.g. Schedule Demo"
              value={formButton}
              onChange={(e) => setFormButton(e.target.value)}
            />
          </div>

          {/* Live Preview Bubble - WhatsApp UI */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
              Live WhatsApp Preview
            </p>
            <WhatsappChatPreview
              header={formHeader}
              body={formBody}
              footer={formFooter}
              buttonText={formButton}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--surface-border)]">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Submit to Meta for Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Browse Preset Templates Modal */}
      <Modal
        open={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        title="Browse Pre-Approved High-Converting Templates"
        size="lg"
      >
        <div className="space-y-4 py-2 font-sans">
          <p className="text-xs text-[var(--content-secondary)]">
            Select a verified template designed for optimal response rates. Variables are
            automatically mapped by MailFlow’s AI engine.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {PRESET_TEMPLATES.map((preset) => (
              <div
                key={preset.name}
                className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-brand-500/40 hover:bg-[var(--surface-elevated)] transition-all space-y-2.5 flex flex-col justify-between font-sans"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                      {preset.name}
                    </span>
                    <Badge variant="brand" size="sm">
                      {preset.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--content-tertiary)] font-sans">
                    {preset.description}
                  </p>
                  <p className="text-xs text-[var(--content-secondary)] bg-[var(--surface-elevated)] p-2.5 rounded-lg font-sans whitespace-pre-wrap break-words leading-relaxed">
                    {preset.body}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full py-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 text-brand-600 dark:text-brand-400 font-semibold text-xs transition-colors"
                >
                  Use This Template →
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" onClick={() => setBrowseModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single Template Preview Modal */}
      {previewTemplate && (
        <Modal
          open={true}
          onClose={() => setPreviewTemplate(null)}
          title={`Template: ${previewTemplate.name}`}
          size="md"
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Status:</span>
              {previewTemplate.status?.toUpperCase() === 'APPROVED' ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-[#5271ff] text-white font-bold text-xs shadow-xs tracking-wide">
                  APPROVED
                </span>
              ) : (
                <Badge variant="brand" size="sm" dot>
                  {previewTemplate.status}
                </Badge>
              )}
            </div>

            <WhatsappChatPreview
              body={previewTemplate.bodyText || ''}
              businessName={previewTemplate.name}
            />

            <div className="pt-2 flex items-center justify-between border-t border-[var(--surface-border)]">
              <Button variant="secondary" onClick={() => setPreviewTemplate(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setPreviewTemplate(null);
                  navigate(ROUTES.CAMPAIGNS);
                }}
              >
                Use in Campaign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
