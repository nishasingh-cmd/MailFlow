/**
 * MailFlow — Email Generator Drawer
 * Phase 7: AI Email Generation
 *
 * All bugs fixed:
 * - Drawer prop: `open` (not `isOpen`)
 * - Button prop: `loading` (not `isLoading`)
 * - API response: properly unwrapped by service layer
 * - All state values guarded with null/fallback checks
 * - Error Boundary wrapper prevents full app crash
 * - All async operations wrapped in try/catch with toast feedback
 */
import { useState, useEffect, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import { Company, EmailDraft, EmailTemplateType, GeneratedEmailResult } from '@mailflow/shared';
import { researchService } from '../../services/research.service';
import { emailGenerationService } from '../../services/email-generation.service';
import { Drawer, Button, Card, Badge, Input, Textarea } from '../ui';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class EmailDrawerErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[EmailGeneratorDrawer] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
            <h4 className="font-bold text-red-300 text-sm mb-1">Something went wrong</h4>
            <p className="text-xs text-red-200/80">{this.state.errorMessage}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onClose();
            }}
          >
            Close
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface EmailGeneratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  leadName?: string | null;
  companyName?: string | null;
  onDraftSaved?: () => void;
}

const TEMPLATES: EmailTemplateType[] = [
  'Cold Outreach',
  'Follow-up',
  'Partnership',
  'Product Demo',
  'Custom Template',
];

function EmailGeneratorDrawerInner({
  isOpen,
  onClose,
  leadId,
  leadName,
  companyName,
  onDraftSaved,
}: EmailGeneratorDrawerProps) {
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  const [template, setTemplate] = useState<EmailTemplateType>('Cold Outreach');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Email output state — all initialised with safe empty values
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Sender context (static defaults — could later come from user profile)
  const senderName = 'Nisha Singh';
  const senderCompany = 'MailFlow';
  const senderProduct = 'Lead Outreach Platform';

  // ── Load existing research + any saved draft ──────────────────────────────
  const loadData = useCallback(async () => {
    if (!leadId) return;
    setLoadingCompany(true);
    try {
      const [compData, existingDraft] = await Promise.all([
        researchService.getResearch(leadId),
        emailGenerationService.getDraftByLead(leadId),
      ]);

      setCompany(compData);

      if (existingDraft) {
        setActiveDraftId(existingDraft.id ?? null);
        setSubject(existingDraft.subject ?? '');
        setBody(existingDraft.body ?? '');
        const savedTemplate = existingDraft.template;
        if (savedTemplate && TEMPLATES.includes(savedTemplate as EmailTemplateType)) {
          setTemplate(savedTemplate as EmailTemplateType);
        }
      }
    } catch (err) {
      console.error('[EmailGenerator] Failed to load data:', err);
    } finally {
      setLoadingCompany(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) {
      // Reset state on new open
      setSubjectSuggestions([]);
      setSubject('');
      setBody('');
      setActiveDraftId(null);
      setActiveTab('edit');
      loadData();
    }
  }, [isOpen, leadId, loadData]);

  // ── AI Email Generation ───────────────────────────────────────────────────
  const handleGenerate = async (selectedTpl: EmailTemplateType = template) => {
    if (!leadId) return;
    setIsGenerating(true);
    try {
      const res: GeneratedEmailResult = await emailGenerationService.generateEmail({
        leadId,
        template: selectedTpl,
        userContext: {
          userName: senderName,
          userCompany: senderCompany,
          userProductService: senderProduct,
        },
      });

      // Guard all fields — API may return partial data or nulls
      const subjects = Array.isArray(res?.subjectSuggestions) ? res.subjectSuggestions : [];
      const selectedSubj = res?.selectedSubject ?? subjects[0] ?? '';
      const emailBody = res?.body ?? '';

      setSubjectSuggestions(subjects);
      setSubject(selectedSubj);
      setBody(emailBody);
      toast.success('AI Personalised Email generated successfully!');
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Failed to generate email';
      if (msg.includes('RESEARCH_NOT_COMPLETED')) {
        toast.error('Please complete company research for this lead first.');
      } else if (msg.includes('LEAD_NOT_FOUND')) {
        toast.error('Lead not found. Please refresh the page and try again.');
      } else {
        toast.error(`Generation failed: ${msg}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Template Change ────────────────────────────────────────────────────────
  const handleTemplateChange = (newTpl: EmailTemplateType) => {
    setTemplate(newTpl);
    // Auto-regenerate only if research is complete
    if (leadId && company?.research?.status === 'COMPLETED') {
      void handleGenerate(newTpl);
    }
  };

  // ── Subject Selection ──────────────────────────────────────────────────────
  const handleSelectSubject = (selected: string) => {
    setSubject(selected);
    toast.success('Subject line updated');
  };

  // ── Save Draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!leadId) return;
    if (!subject.trim() || !body.trim()) {
      toast.error('Please provide a subject and body before saving.');
      return;
    }

    setIsSaving(true);
    try {
      let saved: EmailDraft;
      if (activeDraftId) {
        saved = await emailGenerationService.updateDraft(activeDraftId, {
          subject,
          body,
          template,
          status: 'SAVED',
        });
      } else {
        saved = await emailGenerationService.saveDraft({
          leadId,
          researchId: company?.research?.id,
          subject,
          body,
          template,
          status: 'SAVED',
        });
        setActiveDraftId(saved.id ?? null);
      }
      toast.success('Draft saved successfully!');
      onDraftSaved?.();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const research = company?.research ?? null;
  const isResearchCompleted = research?.status === 'COMPLETED';
  const painPoints = Array.isArray(research?.painPoints) ? (research!.painPoints as string[]) : [];

  return (
    // BUG FIX: Drawer uses `open` prop, NOT `isOpen`
    <Drawer open={isOpen} onClose={onClose} title="✨ AI Email Generator" width="w-[580px]">
      <div className="space-y-6 pb-20">
        {/* ── Loading skeleton ── */}
        {loadingCompany && (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-lg bg-[var(--surface-secondary)]" />
            <div className="h-10 rounded-lg bg-[var(--surface-secondary)]" />
          </div>
        )}

        {/* ── Research Not Completed Warning ── */}
        {!loadingCompany && !isResearchCompleted && (
          <Card variant="default" className="p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <h4 className="font-bold text-amber-300 text-sm">Company Research Required</h4>
                <p className="text-xs text-amber-200/80 mt-1">
                  Company research for <strong>{companyName || 'this lead'}</strong> must be
                  completed before generating a personalized email.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Research Context Summary Card ── */}
        {!loadingCompany && isResearchCompleted && company && (
          <Card
            variant="default"
            className="p-4 space-y-3 bg-[var(--surface-secondary)]/50 border-[var(--surface-border)]"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
                📊 Intelligence Context ({company.name})
              </h4>
              {/* BUG FIX: Badge `size` prop exists — kept as-is */}
              <Badge variant="success" size="sm">
                Research Ready
              </Badge>
            </div>

            <p className="text-xs text-[var(--content-secondary)] line-clamp-2">
              {research?.summary ?? company.description ?? 'No summary available.'}
            </p>

            {painPoints.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-amber-400 block mb-1">
                  Key Pain Points:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {painPoints.slice(0, 3).map((pt, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    >
                      {pt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Template Selector ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider block">
            Select Template
          </label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => handleTemplateChange(tpl)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all border',
                  template === tpl
                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                    : 'bg-[var(--surface-secondary)] text-[var(--content-secondary)] border-[var(--surface-border)] hover:bg-[var(--surface-tertiary)]'
                )}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* ── Generate Action Button ── */}
        <div className="flex items-center gap-3">
          {/* BUG FIX: Button prop is `loading`, not `isLoading` */}
          <Button
            variant="primary"
            onClick={() => void handleGenerate(template)}
            loading={isGenerating}
            disabled={!isResearchCompleted || isGenerating}
            className="flex-1 shadow-lg shadow-brand-500/20"
          >
            {body ? '🔄 Regenerate Email' : '✨ Generate AI Email'}
          </Button>

          {body && (
            <div className="flex bg-[var(--surface-secondary)] p-1 rounded-lg border border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  activeTab === 'edit'
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-[var(--content-tertiary)] hover:text-[var(--content-primary)]'
                )}
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  activeTab === 'preview'
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-[var(--content-tertiary)] hover:text-[var(--content-primary)]'
                )}
              >
                👁️ Preview
              </button>
            </div>
          )}
        </div>

        {/* ── Subject Line Suggestions ── */}
        {subjectSuggestions.length > 0 && (
          <Card variant="default" className="p-4 space-y-2">
            <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
              💡 AI Subject Line Suggestions (Click to Select)
            </h4>
            <div className="space-y-1.5">
              {subjectSuggestions.map((subjOption, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSubject(subjOption)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs rounded-lg transition-all border flex items-center justify-between',
                    subject === subjOption
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-200 font-semibold'
                      : 'bg-[var(--surface-tertiary)]/50 border-[var(--surface-border)] text-[var(--content-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--content-primary)]'
                  )}
                >
                  <span>{subjOption}</span>
                  {subject === subjOption && (
                    <span className="text-brand-400 shrink-0">✓ Selected</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ── Editor / Preview Panel ── */}
        {activeTab === 'edit' ? (
          <div className="space-y-4">
            <Input
              label="Subject Line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick idea for Canva"
            />
            <Textarea
              label="Email Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Generated personalized email body will appear here..."
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        ) : (
          <Card variant="default" className="p-5 space-y-4 bg-zinc-950 border-zinc-800 rounded-xl">
            <div className="border-b border-zinc-800 pb-3 space-y-1.5 text-xs text-zinc-400">
              <div className="flex gap-2">
                <span className="w-16 font-semibold text-zinc-500">From:</span>
                <span className="text-zinc-200 font-medium">
                  {senderName} &lt;you@mailflow.app&gt;
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 font-semibold text-zinc-500">To:</span>
                <span className="text-zinc-200 font-medium">
                  {leadName || 'Lead'} ({companyName || 'Company'})
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 font-semibold text-zinc-500">Subject:</span>
                <span className="text-brand-300 font-semibold">{subject || 'No Subject'}</span>
              </div>
            </div>

            <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed min-h-[180px] font-sans">
              {body || <span className="text-zinc-600 italic">No body content generated yet.</span>}
            </div>

            <div className="border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
              <p className="font-semibold text-zinc-400">{senderName}</p>
              <p>
                {senderCompany} • {senderProduct}
              </p>
            </div>
          </Card>
        )}

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {body && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`Subject: ${subject}\n\n${body}`)
                    .then(() => toast.success('Email copied to clipboard!'))
                    .catch(() => toast.error('Failed to copy to clipboard'));
                }}
              >
                📋 Copy
              </Button>
            )}

            {/* BUG FIX: Button prop is `loading`, not `isLoading` */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSaveDraft()}
              loading={isSaving}
              disabled={!subject || !body || isSaving}
            >
              💾 Save Draft
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — wrapped with Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

export function EmailGeneratorDrawer(props: EmailGeneratorDrawerProps) {
  return (
    <EmailDrawerErrorBoundary onClose={props.onClose}>
      <EmailGeneratorDrawerInner {...props} />
    </EmailDrawerErrorBoundary>
  );
}
