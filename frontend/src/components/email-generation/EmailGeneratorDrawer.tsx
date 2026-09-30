import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import {
  EmailDraft,
  EmailTemplateType,
  GeneratedEmailResult,
  LeadResearchResult,
} from '@mailflow/shared';
import { researchService } from '../../services/research.service';
import { emailGenerationService } from '../../services/email-generation.service';
import { deliveryService } from '../../services/delivery.service';
import { Drawer, Button, Card, Input, Textarea } from '../ui';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

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

  const [company, setCompany] = useState<LeadResearchResult | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  const [template, setTemplate] = useState<EmailTemplateType>('Cold Outreach');
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const senderName = 'Nisha Singh';
  const senderCompany = 'MailFlow';
  const senderProduct = 'Lead Outreach Platform';

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
      setSubjectSuggestions([]);
      setSubject('');
      setBody('');
      setActiveDraftId(null);
      setActiveTab('edit');
      loadData();
    }
  }, [isOpen, leadId, loadData]);

  const handleGenerate = async (selectedTpl: EmailTemplateType = template, isRegen = false) => {
    if (!leadId || isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    const regenSeed = Date.now();
    const currentSubject = subject.trim();

    try {
      const res: GeneratedEmailResult = await emailGenerationService.generateEmail({
        leadId,
        template: selectedTpl,
        regenerate: isRegen,
        regenSeed,
        selectedSubject: currentSubject || undefined,
        userContext: {
          userName: senderName,
          userCompany: senderCompany,
          userProductService: senderProduct,
        },
      });

      const returnedSuggestions =
        Array.isArray(res?.subjectSuggestions) && res.subjectSuggestions.length > 0
          ? res.subjectSuggestions
          : subjectSuggestions;

      // Preserve user's chosen subject: if currentSubject was set, keep it; otherwise use backend's selectedSubject or first suggestion
      const chosenSubject = currentSubject || res?.selectedSubject || returnedSuggestions[0] || '';

      // Build updated list: ensure chosenSubject is present in suggestions
      let updatedSuggestions = [...returnedSuggestions];
      if (chosenSubject && !updatedSuggestions.includes(chosenSubject)) {
        if (subjectSuggestions.includes(chosenSubject)) {
          updatedSuggestions = subjectSuggestions;
        } else {
          updatedSuggestions = [chosenSubject, ...updatedSuggestions];
        }
      }

      setSubjectSuggestions(updatedSuggestions);
      setSubject(chosenSubject);
      setBody(res?.body ?? '');

      toast.success(
        isRegen
          ? 'Email regenerated successfully!'
          : 'AI Personalised Email generated successfully!'
      );
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Failed to generate email';
      console.error('[EmailGenerator] Generation error:', msg);

      if (msg.includes('RESEARCH_MISSING') || msg.includes('RESEARCH_NOT_COMPLETED')) {
        toast.error('Company research is required before generating a personalized email.');
      } else if (msg.includes('RESEARCH_IN_PROGRESS')) {
        toast.error('Research is still in progress. Please wait until completed.');
      } else if (msg.includes('RESEARCH_FAILED')) {
        toast.error('Research failed for this company. Please retry research.');
      } else if (msg.includes('RESEARCH_MISMATCH')) {
        toast.error(
          'Lead research mismatch. Please refresh the research before generating the email.'
        );
      } else if (msg.includes('LEAD_NOT_FOUND')) {
        toast.error('Lead not found. Please refresh the page and try again.');
      } else {
        toast.error(msg);
      }
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleTemplateChange = (newTpl: EmailTemplateType) => {
    setTemplate(newTpl);
  };

  const handleSelectSubject = (selected: string) => {
    setSubject(selected);
    toast.success('Subject line updated');
  };

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

  const handleSendEmail = async () => {
    if (!leadId) return;
    if (!subject.trim() || !body.trim()) {
      toast.error('Please provide a subject and body before sending.');
      return;
    }

    setIsSending(true);
    try {
      const res = await deliveryService.sendSingleEmail({
        leadId,
        subject,
        body,
      });
      toast.success(res.message || 'Email sent successfully!');
      onDraftSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const msg =
        axiosErr.response?.data?.error ||
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        'Failed to send email';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const research = company?.research ?? null;
  const isResearchCompleted = research?.status === 'COMPLETED';

  return (
    <Drawer open={isOpen} onClose={onClose} title="AI Email Generator" width="w-[580px]">
      <div className="space-y-6 pb-20">
        {loadingCompany && (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-lg bg-[var(--surface-secondary)]" />
            <div className="h-10 rounded-lg bg-[var(--surface-secondary)]" />
          </div>
        )}

        {!loadingCompany && !isResearchCompleted && (
          <Card variant="default" className="p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
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

        <div className="space-y-2">
          <label className="text-xs font-bold text-black uppercase tracking-wider block">
            Select Template
          </label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => handleTemplateChange(tpl)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all border',
                  template === tpl
                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                    : 'bg-slate-100 text-black border-slate-300 hover:bg-slate-200'
                )}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => void handleGenerate(template, !!body)}
            loading={isGenerating}
            disabled={!isResearchCompleted || isGenerating}
            className="flex-1 shadow-lg shadow-brand-500/20"
          >
            {body ? 'Regenerate Email' : 'Generate AI Email'}
          </Button>

          {body && (
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-colors',
                  activeTab === 'edit'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-black hover:bg-slate-200'
                )}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-colors',
                  activeTab === 'preview'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-black hover:bg-slate-200'
                )}
              >
                Preview
              </button>
            </div>
          )}
        </div>

        {subjectSuggestions.length > 0 && (
          <Card variant="default" className="p-4 space-y-2 border-slate-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              AI Subject Line Suggestions (Click to Select)
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
                      ? 'bg-indigo-50 border-indigo-400 text-black font-bold shadow-sm'
                      : 'bg-white border-slate-200 text-black font-semibold hover:bg-slate-50 hover:border-slate-300'
                  )}
                >
                  <span className="text-black font-semibold">{subjOption}</span>
                  {subject === subjOption && (
                    <span className="text-black font-bold shrink-0">✓ Selected</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'edit' ? (
          <div className="space-y-4">
            <Input
              label="Subject Line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick idea for Canva"
              className="text-black font-medium"
            />
            <Textarea
              label="Email Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Generated personalized email body will appear here..."
              className="font-mono text-xs leading-relaxed text-black font-medium"
            />
          </div>
        ) : (
          <Card
            variant="default"
            className="p-5 space-y-4 bg-white border-slate-200 rounded-xl shadow-elevation-1"
          >
            <div className="border-b border-slate-200 pb-3 space-y-1.5 text-xs text-black">
              <div className="flex gap-2">
                <span className="w-16 font-bold text-black">From:</span>
                <span className="text-black font-medium">
                  {senderName} &lt;you@mailflow.app&gt;
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 font-bold text-black">To:</span>
                <span className="text-black font-medium">
                  {leadName || 'Lead'} ({companyName || 'Company'})
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 font-bold text-black">Subject:</span>
                <span className="text-black font-bold">{subject || 'No Subject'}</span>
              </div>
            </div>

            <div className="text-xs text-black whitespace-pre-wrap leading-relaxed min-h-[180px] font-sans font-medium">
              {body || <span className="text-black italic">No body content generated yet.</span>}
            </div>

            <div className="border-t border-slate-200 pt-3 text-xs text-black">
              <p className="font-bold text-black">{senderName}</p>
              <p className="text-black font-medium">
                {senderCompany} • {senderProduct}
              </p>
            </div>
          </Card>
        )}

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
                Copy
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSaveDraft()}
              loading={isSaving}
              disabled={!subject || !body || isSaving || isSending}
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSendEmail()}
              loading={isSending}
              disabled={!subject || !body || isSaving || isSending}
              className="bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20"
            >
              Send Email
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export function EmailGeneratorDrawer(props: EmailGeneratorDrawerProps) {
  return (
    <EmailDrawerErrorBoundary onClose={props.onClose}>
      <EmailGeneratorDrawerInner {...props} />
    </EmailDrawerErrorBoundary>
  );
}
