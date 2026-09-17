import { useState, useEffect, useCallback } from 'react';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';
import { Button, Badge, Skeleton, Modal, ConfirmModal } from '../../components/ui';
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

import { WhatsappChatPreview } from '../../components/whatsapp/WhatsappChatPreview';

export default function TemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [templates, setTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modals
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsappMetaTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<WhatsappMetaTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      await whatsappService.deleteTemplate(templateToDelete.name);
      toast.success(`Template "${templateToDelete.name}" deleted successfully.`);
      setTemplates((prev) => prev.filter((t) => t.name !== templateToDelete.name));
      setTemplateToDelete(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete template.');
    } finally {
      setDeleting(false);
    }
  };

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
    setBrowseModalOpen(false);
    navigate(ROUTES.TEMPLATES_CREATE, { state: { preset } });
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
            onClick={() => navigate(ROUTES.TEMPLATES_CREATE)}
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
            onClick={() => navigate(ROUTES.TEMPLATES_CREATE)}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
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
                    className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Preview Bubble</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(t.name);
                        toast.success(`Copied "${t.name}" to clipboard`);
                      }}
                      className="text-[var(--content-tertiary)] hover:text-[var(--content-primary)] font-medium transition-colors cursor-pointer"
                    >
                      Copy Name
                    </button>
                    <button
                      onClick={() => setTemplateToDelete(t)}
                      title={`Delete template "${t.name}"`}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors cursor-pointer p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="sr-only sm:not-sr-only text-2xs font-semibold">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!templateToDelete}
        title="Delete Template?"
        description={
          <span>
            Are you sure you want to delete template{' '}
            <strong className="text-slate-900 dark:text-white">
              &quot;{templateToDelete?.name}&quot;
            </strong>
            ?
            <br />
            <br />
            This will permanently remove the template from your WhatsApp Business Account on Meta.
            This action cannot be undone.
          </span>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTemplate}
        onCancel={() => !deleting && setTemplateToDelete(null)}
      />
    </div>
  );
}
