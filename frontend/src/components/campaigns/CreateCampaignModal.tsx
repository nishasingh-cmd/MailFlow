import { useState, useEffect, useCallback, useMemo } from 'react';
import { EmailTemplateType, Lead, ImportHistory } from '@mailflow/shared';
import { Modal, Button, Input, Textarea, Select, Badge } from '../ui';
import { LeadPickerTable } from './LeadPickerTable';
import { campaignService } from '../../services/campaign.service';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { leadService } from '../../services/lead.service';
import { researchService } from '../../services/research.service';
import {
  detectTemplateVariables,
  resolveCampaignTemplateVariables,
  SenderBusinessContext,
  isBusinessProfileField,
} from '../../utils/whatsapp-variable-resolver';
import { businessProfileService, BusinessProfile } from '../../services/business-profile.service';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialSelectedLeadIds?: string[];
}

const STEPS = ['Details & Channel', 'Select Leads', 'Template & AI Setup', 'Review'];

const EMAIL_TEMPLATE_OPTIONS = [
  { value: '', label: 'None (Default AI Cold Outreach)' },
  { value: 'Cold Outreach', label: 'Cold Outreach' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Product Demo', label: 'Product Demo' },
  { value: 'Custom Template', label: 'Custom Template' },
];

function renderAnalyzedMessage(templateText: string, variables: Record<string, string>) {
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

interface EmailFrameworkDetails {
  label: string;
  goal: string;
  tone: string;
  bestFor: string;
  subject: (ctx: { company: string; industry: string; name: string }) => string;
  intro: (ctx: { company: string; industry: string; name: string }) => string;
  painPoint: (ctx: { company: string; industry: string; name: string }) => string;
  solution: (ctx: { company: string; industry: string; name: string }) => string;
  cta: (ctx: { company: string; industry: string; name: string }) => string;
}

const EMAIL_FRAMEWORK_DETAILS: Record<string, EmailFrameworkDetails> = {
  'Cold Outreach': {
    label: 'Cold Outreach',
    goal: 'Value-First Account Introduction & Discovery',
    tone: 'Consultative, Professional & Relevant',
    bestFor: 'Net-new outbound prospect outreach',
    subject: ({ company }) => `Quick idea regarding ${company}'s growth initiatives`,
    intro: ({ company, industry }) =>
      `I came across ${company}'s work in ${industry} and wanted to reach out directly.`,
    painPoint: () =>
      `Scaling outbound messaging while maintaining authentic personalization is a key priority for outreach teams.`,
    solution: () =>
      `MailFlow helps teams research leads and create personalized outreach faster from one unified workflow.`,
    cta: ({ company }) =>
      `Would you be open to a brief 10-minute chat to explore if this fits ${company}'s current workflow?`,
  },
  Partnership: {
    label: 'Partnership',
    goal: 'Strategic Co-Marketing, Channel Distribution & Synergy',
    tone: 'Executive, High-Trust & Peer-to-Peer',
    bestFor: 'Agencies, strategic partners, and ecosystem alliances',
    subject: ({ company }) => `Strategic collaboration idea for ${company}`,
    intro: ({ company, industry }) =>
      `Given ${company}'s standing in ${industry}, I wanted to reach out regarding a potential mutual partnership.`,
    painPoint: () =>
      `We frequently collaborate with forward-thinking leaders who want to broaden their service capabilities without additional operational overhead.`,
    solution: () =>
      `Our platform empowers teams to combine prospect intelligence and omni-channel automation directly into their existing workflow.`,
    cta: () =>
      `Would you or your team be open to exploring potential synergies over a brief introductory chat?`,
  },
  'Follow-up': {
    label: 'Follow-up',
    goal: 'Zero-Pressure Re-engagement with Fresh Context',
    tone: 'Warm, Casual & High-Relevance',
    bestFor: 'Unresponsive prospects after initial touchpoint',
    subject: ({ company }) => `Re: Thoughts for ${company}`,
    intro: ({ company }) =>
      `Circling back on my previous note regarding ${company}'s outreach workflow.`,
    painPoint: ({ industry }) =>
      `Teams in ${industry} often spend significant manual effort on prospect research that could be streamlined.`,
    solution: () =>
      `MailFlow eliminates manual research friction and helps teams launch authentic outreach faster.`,
    cta: () => `Would you have 10 minutes sometime this week for a quick check-in?`,
  },
  'Product Demo': {
    label: 'Product Demo',
    goal: 'Interactive Live Walkthrough & Solution Demonstration',
    tone: 'Product-Led, Practical & Action-Oriented',
    bestFor: 'High-intent prospects, qualified leads, and software evaluators',
    subject: ({ company }) => `10-minute interactive walkthrough for ${company}`,
    intro: ({ company, industry }) =>
      `I noticed ${company}'s work in ${industry} and wanted to connect regarding your outreach workflow.`,
    painPoint: () =>
      `Most teams find it challenging to balance high lead volume with truly tailored individual messaging.`,
    solution: ({ company }) =>
      `I have assembled a tailored live walkthrough demonstrating how MailFlow solves this by unifying lead intelligence and personalized outreach for ${company}.`,
    cta: ({ company }) =>
      `Would you be open to a brief 10-minute demonstration customized for ${company}?`,
  },
  'Custom Template': {
    label: 'Custom Template',
    goal: 'Customized Messaging Guided by Bespoke AI Directives',
    tone: 'Adaptive, Persona-Driven & Campaign Specific',
    bestFor: 'Specialized niche campaigns, customized pitches, or event outreach',
    subject: ({ company }) => `Tailored outreach initiative for ${company}`,
    intro: ({ company, industry }) =>
      `Reaching out specifically regarding ${company}'s strategic initiatives in ${industry}.`,
    painPoint: () =>
      `Every campaign has unique requirements, brand voice guidelines, and conversion triggers.`,
    solution: () =>
      `MailFlow's AI adapts directly to your custom instructions, producing bespoke messaging tuned to your business profile.`,
    cta: () =>
      `Let me know if you'd be interested in reviewing how we can tailor this for your goals.`,
  },
};

function renderEmailHighlightedText(
  text: string,
  _tokens?: { company?: string; industry?: string }
) {
  return text;
}

export function CreateCampaignModal({
  open,
  onClose,
  onCreated,
  initialSelectedLeadIds,
}: CreateCampaignModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP'>('EMAIL');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Dataset / Sheet selection states
  const [datasets, setDatasets] = useState<ImportHistory[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedDatasetName, setSelectedDatasetName] = useState<string>('');
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // WhatsApp Dynamic Variable Mapping state (variableIndex -> datasetColumn / businessField)
  const [whatsappVariableMapping, setWhatsappVariableMapping] = useState<Record<string, string>>(
    {}
  );
  const [mappingError, setMappingError] = useState<string>('');

  // Business Profile state (from client initial onboarding)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    if (open && initialSelectedLeadIds && initialSelectedLeadIds.length > 0) {
      setSelectedLeadIds(initialSelectedLeadIds);
    }
  }, [open, initialSelectedLeadIds]);

  // Fetch client initial business profile
  useEffect(() => {
    if (!open) return;
    businessProfileService
      .getProfile()
      .then((profile) => {
        if (profile) setBusinessProfile(profile);
      })
      .catch((err) => {
        console.warn('[CreateCampaignModal] Error fetching business profile:', err);
      });
  }, [open]);

  // Authoritative sender & business context
  const senderContext = useMemo<SenderBusinessContext>(
    () => ({
      user: user ? { name: user.name, email: user.email } : null,
      businessProfile,
    }),
    [user, businessProfile]
  );

  // Business Profile mapping options from initial client onboarding
  const businessOptions = useMemo(() => {
    return [
      {
        value: 'My Business Name',
        label: `My Business Name (${businessProfile?.businessName || 'Sociokraft Global Outreach'})`,
      },
      {
        value: 'My Name (Sender)',
        label: `My Name / Sender (${user?.name || 'Nisha Singh'})`,
      },
      {
        value: 'My Website',
        label: `My Website (${businessProfile?.website || 'https://www.sociokraft.in'})`,
      },
      {
        value: 'My Products / Services',
        label: `My Products / Services (${businessProfile?.productsOrServices ? businessProfile.productsOrServices.substring(0, 32) + '...' : 'Outreach Services'})`,
      },
      {
        value: 'My Industry',
        label: `My Industry (${businessProfile?.industry || 'Marketing & Advertising'})`,
      },
      {
        value: 'My Value Proposition',
        label: `My Value Proposition (${businessProfile?.valueProposition ? businessProfile.valueProposition.substring(0, 32) + '...' : 'Client Acquisition'})`,
      },
    ];
  }, [businessProfile, user]);

  // Fetch user's uploaded datasets / import history
  useEffect(() => {
    if (!open) return;
    setLoadingDatasets(true);
    leadService
      .getImportHistory()
      .then((history) => {
        setDatasets(history || []);
        if (history && history.length > 0 && !selectedDatasetId) {
          setSelectedDatasetId(history[0].id);
          setSelectedDatasetName(history[0].fileName);
        }
      })
      .catch((err) => {
        console.error('[CreateCampaignModal] Error fetching import history:', err);
      })
      .finally(() => setLoadingDatasets(false));
  }, [open, selectedDatasetId]);

  // Fetch dataset columns whenever selectedDatasetId changes
  useEffect(() => {
    if (!selectedDatasetId) {
      setDatasetColumns([]);
      setSelectedDatasetName('');
      return;
    }

    setLoadingColumns(true);
    campaignService
      .getDatasetColumns(selectedDatasetId)
      .then((res) => {
        if (res?.columns) {
          setDatasetColumns(res.columns);
          setSelectedDatasetName(res.datasetName);

          // Revalidate existing variable mappings against new dataset columns or business fields
          setWhatsappVariableMapping((prev) => {
            const next: Record<string, string> = {};
            let changed = false;
            Object.entries(prev).forEach(([varIdx, col]) => {
              if (res.columns.includes(col) || isBusinessProfileField(col)) {
                next[varIdx] = col;
              } else {
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        }
      })
      .catch((err) => {
        console.error('[CreateCampaignModal] Error fetching dataset columns:', err);
        setDatasetColumns([]);
      })
      .finally(() => setLoadingColumns(false));
  }, [selectedDatasetId]);

  // Email template state
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType | ''>('Cold Outreach');

  // WhatsApp Meta template state
  const [waTemplates, setWaTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [loadingWaTemplates, setLoadingWaTemplates] = useState(false);
  const [selectedWaTemplateName, setSelectedWaTemplateName] = useState<string>('cold_outreach');

  // Multi-channel setup tab switcher
  const [activeSetupTab, setActiveSetupTab] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');

  // Leads tracking and AI personalization preview state
  const [leadsMap, setLeadsMap] = useState<Record<string, Lead>>({});
  const [leadResearches, setLeadResearches] = useState<
    Record<string, { industry?: string | null }>
  >({});

  const handleLeadsLoaded = useCallback((loadedLeads: Lead[]) => {
    setLeadsMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const l of loadedLeads) {
        if (!next[l.id] || next[l.id].name !== l.name || next[l.id].company !== l.company) {
          next[l.id] = l;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);
  const [previewLeadId, setPreviewLeadId] = useState<string>('');
  const [previewData, setPreviewData] = useState<{
    leadId: string;
    leadName: string;
    companyName: string;
    industry?: string;
    phone: string;
    templateName: string;
    templateLang: string;
    variables: Record<string, string>;
    templateParams: string[];
    previewText: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync tab with channel
  useEffect(() => {
    if (channel === 'WHATSAPP') setActiveSetupTab('WHATSAPP');
    if (channel === 'EMAIL') setActiveSetupTab('EMAIL');
  }, [channel]);

  // Set default previewLeadId from selected leads
  useEffect(() => {
    if (selectedLeadIds.length > 0) {
      if (!previewLeadId || !selectedLeadIds.includes(previewLeadId)) {
        setPreviewLeadId(selectedLeadIds[0]);
      }
    }
  }, [selectedLeadIds, previewLeadId]);

  // Fetch Meta templates when modal opens or channel switches
  useEffect(() => {
    if (!open) return;
    if (channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP') {
      setLoadingWaTemplates(true);
      whatsappService
        .getTemplates()
        .then((res) => {
          if (res?.templates && res.templates.length > 0) {
            setWaTemplates(res.templates);
            const approved = res.templates.find((t) => t.status === 'APPROVED');
            if (approved) {
              setSelectedWaTemplateName(approved.name);
            } else {
              setSelectedWaTemplateName(res.templates[0].name);
            }
          } else {
            setWaTemplates([]);
            setSelectedWaTemplateName('');
          }
        })
        .catch(() => {
          setWaTemplates([]);
          setSelectedWaTemplateName('');
        })
        .finally(() => setLoadingWaTemplates(false));
    }
  }, [open, channel]);

  // Fetch lead records for selected leads if not in leadsMap
  useEffect(() => {
    if (!open || step !== 2) return;

    const missingIds = selectedLeadIds.filter((id) => !leadsMap[id]);
    if (
      missingIds.length > 0 ||
      (selectedLeadIds.length === 0 && Object.keys(leadsMap).length === 0)
    ) {
      leadService
        .getLeads({ limit: 100 })
        .then((res) => {
          if (res?.leads) {
            setLeadsMap((prev) => {
              const next = { ...prev };
              res.leads.forEach((l) => {
                next[l.id] = l;
              });
              return next;
            });
            if (selectedLeadIds.length === 0 && res.leads.length > 0 && !previewLeadId) {
              setPreviewLeadId(res.leads[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [open, step, channel, selectedLeadIds, leadsMap, previewLeadId]);

  // Fetch verified research for preview lead
  useEffect(() => {
    if (!open || step !== 2 || !previewLeadId) return;
    if (leadResearches[previewLeadId]) return;

    researchService
      .getResearch(previewLeadId)
      .then((res) => {
        if (res?.research?.industry) {
          setLeadResearches((prev) => ({
            ...prev,
            [previewLeadId]: { industry: res.research?.industry },
          }));
        }
      })
      .catch(() => {});
  }, [open, step, previewLeadId, leadResearches]);

  // Trigger AI lead analysis preview whenever template or preview lead changes
  useEffect(() => {
    if (!open || step !== 2) return;
    if (channel !== 'WHATSAPP' && channel !== 'EMAIL_AND_WHATSAPP') return;

    let isMounted = true;
    setLoadingPreview(true);

    const activeTpl = waTemplates.find((t) => t.name === selectedWaTemplateName) || waTemplates[0];

    whatsappService
      .previewTemplate(
        previewLeadId || undefined,
        selectedWaTemplateName,
        activeTpl?.bodyText || undefined
      )
      .then((data) => {
        if (isMounted && data) {
          setPreviewData(data);
        }
      })
      .catch((err) => {
        console.warn('[CreateCampaignModal] Preview error:', err);
        if (isMounted) {
          const lead = previewLeadId ? leadsMap[previewLeadId] : null;
          const leadName = lead?.name?.trim() || 'Prospect';
          const companyName = lead?.company || leadName || 'Company';
          const vars: Record<string, string> = {
            '1': leadName,
            '2': companyName,
            '3': lead?.industry || 'Industry',
          };
          let txt =
            activeTpl?.bodyText ||
            "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!";
          Object.entries(vars).forEach(([k, v]) => {
            txt = txt.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), v);
          });
          setPreviewData({
            leadId: lead?.id || 'sample',
            leadName,
            companyName,
            industry: lead?.industry || 'Industry',
            phone: lead?.phone || '',
            templateName: selectedWaTemplateName,
            templateLang: activeTpl?.language || 'en',
            variables: vars,
            templateParams: Object.values(vars),
            previewText: txt,
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, step, channel, previewLeadId, selectedWaTemplateName, waTemplates, leadsMap]);

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setChannel('EMAIL');
    setSelectedLeadIds([]);
    setEmailTemplate('Cold Outreach');
    setSelectedWaTemplateName('cold_outreach');
    setActiveSetupTab('EMAIL');
    setSelectedDatasetId('');
    setSelectedDatasetName('');
    setDatasetColumns([]);
    setWhatsappVariableMapping({});
    setMappingError('');
    setPreviewLeadId('');
    setPreviewData(null);
    setNameError('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleNext = () => {
    if (step === 0) {
      if (!name.trim()) {
        setNameError('Campaign name is required');
        return;
      }
      setNameError('');
    }
    if (step === 1) {
      if (!selectedDatasetId) {
        toast.error('Please select a target dataset / sheet.');
        return;
      }
      if (selectedLeadIds.length === 0) {
        toast.error('Please select at least one lead from the dataset.');
        return;
      }
    }
    if (step === 2) {
      if (channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP') {
        const unmapped = detectedVariables.filter((v) => !whatsappVariableMapping[v.index]);
        if (unmapped.length > 0) {
          setMappingError(
            `Please map all template variables (${unmapped.map((u) => `{{${u.index}}}`).join(', ')}) to a column from "${selectedDatasetName || 'dataset'}" before proceeding.`
          );
          return;
        }
      }
      setMappingError('');
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleCreate = async () => {
    if (submitting) return;

    const campaignName = name.trim();
    if (!campaignName) {
      setNameError('Campaign name is required');
      setStep(0);
      return;
    }

    setSubmitting(true);
    try {
      const chosenTemplateId =
        channel === 'WHATSAPP' ? selectedWaTemplateName : emailTemplate || undefined;

      await campaignService.createCampaign({
        name: campaignName,
        campaignName: campaignName,
        description: description.trim() || undefined,
        channel: channel,
        leadIds: selectedLeadIds,
        selectedLeadIds: selectedLeadIds,
        templateId: chosenTemplateId,
        selectedTemplate: chosenTemplateId,
        datasetId: selectedDatasetId || undefined,
        whatsappTemplateName: channel !== 'EMAIL' ? selectedWaTemplateName : undefined,
        whatsappVariableMapping: channel !== 'EMAIL' ? whatsappVariableMapping : undefined,
        status: 'DRAFT',
        createdBy: user?.name || user?.email || 'User',
      });
      toast.success('Campaign created successfully.');
      onCreated();
      handleClose();
    } catch (error: unknown) {
      console.error('[CreateCampaignModal] Error creating campaign:', error);
      const err = error as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create campaign';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const activeWaTemplate =
    waTemplates.find((t) => t.name === selectedWaTemplateName) || waTemplates[0];

  // Helper to extract variable placeholders from template text
  const templateBody =
    activeWaTemplate?.bodyText ||
    "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!";

  const detectedVariables = useMemo(() => {
    return detectTemplateVariables(templateBody);
  }, [templateBody]);

  const selectedLeadsList = selectedLeadIds
    .map((id) => leadsMap[id])
    .filter((l): l is Lead => Boolean(l));

  const previewLead = previewLeadId ? leadsMap[previewLeadId] : selectedLeadsList[0] || null;

  const resolvedPreview = useMemo(() => {
    return resolveCampaignTemplateVariables(whatsappVariableMapping, previewLead, senderContext);
  }, [whatsappVariableMapping, previewLead, senderContext]);

  const missingDataReport = useMemo(() => {
    if (channel !== 'WHATSAPP' && channel !== 'EMAIL_AND_WHATSAPP') return null;
    if (detectedVariables.length === 0) return null;

    const unmappedVariables = detectedVariables.filter((v) => !whatsappVariableMapping[v.index]);

    const leadsWithMissingData: Array<{ lead: Lead; missingCols: string[] }> = [];

    for (const lead of selectedLeadsList) {
      const res = resolveCampaignTemplateVariables(whatsappVariableMapping, lead, senderContext);
      if (res.missingVariables.length > 0) {
        leadsWithMissingData.push({
          lead,
          missingCols: res.missingVariables.map((m) => m.column),
        });
      }
    }

    return {
      unmappedVariables,
      leadsWithMissingData,
      totalSelected: selectedLeadsList.length,
    };
  }, [channel, detectedVariables, whatsappVariableMapping, selectedLeadsList, senderContext]);
  const leadDisplayName = previewLead?.name || previewData?.leadName || 'Contact';
  const leadFirstName = leadDisplayName.split(' ')[0] || leadDisplayName;
  const leadDisplayCompany = previewLead?.company || previewData?.companyName || 'your company';
  const leadDisplayIndustry =
    leadResearches[previewLead?.id || '']?.industry ||
    previewLead?.industry ||
    previewData?.industry ||
    'your domain';
  const leadDisplayEmail = previewLead?.email || 'contact@example.com';

  const effectiveEmailFramework = emailTemplate || 'Cold Outreach';
  const currentEmailFramework =
    EMAIL_FRAMEWORK_DETAILS[effectiveEmailFramework] || EMAIL_FRAMEWORK_DETAILS['Cold Outreach'];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Outreach Campaign"
      size="xl"
      persistent
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={handleBack} disabled={submitting}>
                ← Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={handleNext}>
                Next →
              </Button>
            ) : (
              <Button
                id="create-campaign-submit-btn"
                variant="primary"
                onClick={handleCreate}
                loading={submitting}
                disabled={submitting}
                type="button"
              >
                Create Campaign
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => (i < step ? setStep(i) : undefined)}
              className={cn(
                'flex items-center gap-2 text-xs font-medium transition-colors',
                i < step ? 'cursor-pointer text-brand-400' : 'cursor-default',
                i === step
                  ? 'text-[var(--content-primary)]'
                  : i > step
                    ? 'text-[var(--content-tertiary)]'
                    : ''
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i === step
                    ? 'bg-brand-500 text-white'
                    : i < step
                      ? 'bg-blue-600 text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--content-tertiary)]'
                )}
              >
                {i < step ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2',
                  i < step ? 'bg-brand-500/40' : 'bg-[var(--surface-border)]'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <Input
            id="campaign-name"
            label="Campaign Name *"
            placeholder="e.g. Q3 Outbound Outreach"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
            autoFocus
          />

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--content-secondary)]">
              Choose Outreach Channel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* EMAIL CARD */}
              <div
                onClick={() => setChannel('EMAIL')}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left space-y-2',
                  channel === 'EMAIL'
                    ? 'border-brand-500 bg-brand-500/10 shadow-elevation-1'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-brand-500/40'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <svg
                      className="w-5 h-5 text-brand-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <Badge variant={channel === 'EMAIL' ? 'brand' : 'neutral'} size="sm">
                      Email
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--content-primary)]">
                    Email Outreach
                  </h4>
                  <p className="text-xs text-[var(--content-secondary)] leading-relaxed">
                    AI generates a <strong>full personalized email</strong> (Subject, Body, CTA) for
                    every lead.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--surface-border)] text-xs text-[var(--content-tertiary)]">
                  Flow: Research → Full AI Email → Edit → Send
                </div>
              </div>

              {/* WHATSAPP CARD */}
              <div
                onClick={() => setChannel('WHATSAPP')}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left space-y-2',
                  channel === 'WHATSAPP'
                    ? 'border-blue-600 bg-blue-500/10 shadow-elevation-1'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-blue-500/40'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <Badge
                      variant="neutral"
                      size="sm"
                      className="text-slate-900 dark:text-white font-medium"
                    >
                      WhatsApp
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--content-primary)]">
                    WhatsApp Outreach
                  </h4>
                  <p className="text-xs text-[var(--content-secondary)] leading-relaxed">
                    Sent using <strong>approved Meta templates</strong>. AI personalizes template{' '}
                    <strong>variables only</strong>.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--surface-border)] text-xs text-slate-800 dark:text-slate-200">
                  Flow: Research → Variables Only → Meta Template
                </div>
              </div>

              {/* MULTI-CHANNEL CARD */}
              <div
                onClick={() => setChannel('EMAIL_AND_WHATSAPP')}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left space-y-2',
                  channel === 'EMAIL_AND_WHATSAPP'
                    ? 'border-blue-600 bg-blue-500/10 shadow-elevation-1'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-blue-500/40'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <svg
                      className={cn(
                        'w-5 h-5',
                        channel === 'EMAIL_AND_WHATSAPP' ? 'text-blue-600' : 'text-blue-500/70'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <Badge
                      variant={channel === 'EMAIL_AND_WHATSAPP' ? 'brand' : 'neutral'}
                      size="sm"
                    >
                      Multi-Channel
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--content-primary)]">
                    Email + WhatsApp
                  </h4>
                  <p className="text-xs text-[var(--content-secondary)] leading-relaxed">
                    Combined outreach: Full personalized email + approved Meta WhatsApp template.
                  </p>
                </div>
                <div
                  className={cn(
                    'pt-2 border-t border-[var(--surface-border)] text-xs',
                    channel === 'EMAIL_AND_WHATSAPP'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-slate-500'
                  )}
                >
                  Dual-touch channel pipeline
                </div>
              </div>
            </div>
          </div>

          <Textarea
            id="campaign-description"
            label="Description (Optional)"
            placeholder="What is this campaign about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target Lead Dataset / Sheet *
            </label>
            {loadingDatasets ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Loading datasets...
              </div>
            ) : (
              <select
                id="campaign-dataset-select"
                value={selectedDatasetId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDatasetId(newId);
                  const found = datasets.find((d) => d.id === newId);
                  setSelectedDatasetName(
                    found ? found.fileName : newId === 'MANUAL' ? 'Manual & Direct Leads' : ''
                  );
                  setSelectedLeadIds([]);
                }}
                className="w-full text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a dataset / sheet --</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    📄 {d.fileName} ({d.importedCount || d.totalRows} leads •{' '}
                    {new Date(d.createdAt).toLocaleDateString()})
                  </option>
                ))}
                <option value="MANUAL">👤 Manual & Direct Leads</option>
              </select>
            )}
          </div>

          {!selectedDatasetId ? (
            <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Please select a dataset above to view and pick leads
              </p>
              <p className="text-xs text-slate-500">
                Each campaign is tied to a specific dataset so column variable mapping is
                authoritative and isolated.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <LeadPickerTable
                selectedIds={selectedLeadIds}
                onChange={setSelectedLeadIds}
                onLeadsLoaded={handleLeadsLoaded}
                importHistoryId={selectedDatasetId}
              />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 font-sans">
          {/* Multi-channel tab switcher */}
          {channel === 'EMAIL_AND_WHATSAPP' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--surface-border)]">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 max-w-xs w-full">
                <button
                  type="button"
                  onClick={() => setActiveSetupTab('EMAIL')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    activeSetupTab === 'EMAIL'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Email Setup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSetupTab('WHATSAPP')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    activeSetupTab === 'WHATSAPP'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <svg
                    className="w-3.5 h-3.5 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z" />
                  </svg>
                  <span>WhatsApp Setup</span>
                </button>
              </div>
              <span className="text-xs text-[var(--content-secondary)] font-medium">
                Step 3 of 4: Setup {activeSetupTab === 'EMAIL' ? 'Email Tone' : 'WhatsApp Template'}
              </span>
            </div>
          )}

          {/* EMAIL SETUP */}
          {(channel === 'EMAIL' ||
            (channel === 'EMAIL_AND_WHATSAPP' && activeSetupTab === 'EMAIL')) && (
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)] space-y-4">
              <Select
                id="campaign-email-template"
                label="Tone / Framework"
                value={emailTemplate}
                onChange={(val) => setEmailTemplate(val as EmailTemplateType | '')}
                options={EMAIL_TEMPLATE_OPTIONS}
              />

              {/* Live Email Preview with Framework Details */}
              <div className="space-y-3 pt-3 border-t border-[var(--surface-border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Live Email Preview
                    </span>
                  </div>

                  {/* Lead Selector if multiple leads */}
                  {selectedLeadsList.length > 1 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Preview lead:</span>
                      <select
                        value={previewLeadId || selectedLeadsList[0]?.id}
                        onChange={(e) => setPreviewLeadId(e.target.value)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1 max-w-[200px] truncate"
                      >
                        {selectedLeadsList.map((lead, idx) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.name || `Lead ${idx + 1}`}{' '}
                            {lead.company ? `(${lead.company})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Personalized for:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {leadDisplayName}
                      </strong>{' '}
                      ({leadDisplayCompany})
                    </span>
                  )}
                </div>

                {/* Email Client Mockup */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#161f2e] shadow-xs">
                  {/* Email Header Bar */}
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-16 shrink-0">
                        Subject:
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {currentEmailFramework.subject({
                          company: leadDisplayCompany,
                          industry: leadDisplayIndustry,
                          name: leadDisplayName,
                        })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>From:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {user?.name || user?.email?.split('@')[0] || 'You'} (via MailFlow AI)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>To:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {leadDisplayName} &lt;{leadDisplayEmail}&gt;
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="p-4 sm:p-5 space-y-3 text-[13px] sm:text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200 font-sans">
                    <p className="font-medium">Hi {leadFirstName},</p>

                    <p>
                      {renderEmailHighlightedText(
                        currentEmailFramework.intro({
                          company: leadDisplayCompany,
                          industry: leadDisplayIndustry,
                          name: leadDisplayName,
                        }),
                        { company: leadDisplayCompany, industry: leadDisplayIndustry }
                      )}
                    </p>

                    <p>
                      {renderEmailHighlightedText(
                        currentEmailFramework.painPoint({
                          company: leadDisplayCompany,
                          industry: leadDisplayIndustry,
                          name: leadDisplayName,
                        }),
                        { company: leadDisplayCompany, industry: leadDisplayIndustry }
                      )}
                    </p>

                    <p>
                      {renderEmailHighlightedText(
                        currentEmailFramework.solution({
                          company: leadDisplayCompany,
                          industry: leadDisplayIndustry,
                          name: leadDisplayName,
                        }),
                        { company: leadDisplayCompany, industry: leadDisplayIndustry }
                      )}
                    </p>

                    <p className="font-medium text-slate-900 dark:text-white">
                      {renderEmailHighlightedText(
                        currentEmailFramework.cta({
                          company: leadDisplayCompany,
                          industry: leadDisplayIndustry,
                          name: leadDisplayName,
                        }),
                        { company: leadDisplayCompany, industry: leadDisplayIndustry }
                      )}
                    </p>

                    <div className="pt-2 text-slate-600 dark:text-slate-400 text-xs">
                      <p>Best regards,</p>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {user?.name || user?.email?.split('@')[0] || 'Your Name'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WHATSAPP SETUP */}
          {(channel === 'WHATSAPP' ||
            (channel === 'EMAIL_AND_WHATSAPP' && activeSetupTab === 'WHATSAPP')) && (
            <div className="space-y-4 font-sans">
              {/* Template selector */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)]">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Approved Template
                  </label>
                  {loadingWaTemplates ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Loading templates from Meta...
                    </div>
                  ) : (
                    <select
                      value={selectedWaTemplateName}
                      onChange={(e) => setSelectedWaTemplateName(e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {waTemplates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Dynamic WhatsApp Variable Mapping Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-black dark:text-white">
                        Template Variable Mapping
                      </h4>
                    </div>
                    <p className="text-xs text-black dark:text-white mt-1">
                      Map each template placeholder to a column from{' '}
                      <strong className="font-semibold text-black dark:text-white">
                        {selectedDatasetName || 'selected dataset'}
                      </strong>
                      .
                    </p>
                  </div>

                  {loadingColumns && (
                    <span className="text-xs text-black dark:text-white flex items-center gap-1.5 shrink-0 font-normal">
                      <span className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                      Loading columns...
                    </span>
                  )}
                </div>

                {detectedVariables.length === 0 ? (
                  <div className="py-3 px-4 text-center text-xs text-black dark:text-white bg-slate-50 dark:bg-slate-900/50 rounded-xl font-normal">
                    This template contains no variable placeholders (static message).
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {detectedVariables.map((v) => {
                      const mappedCol = whatsappVariableMapping[v.index] || '';

                      return (
                        <div
                          key={v.index}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded text-xs font-normal text-black dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0">
                                {`{{${v.index}}}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                              <select
                                id={`variable-mapping-${v.index}`}
                                value={mappedCol}
                                onChange={(e) => {
                                  const newCol = e.target.value;
                                  setWhatsappVariableMapping((prev) => ({
                                    ...prev,
                                    [v.index]: newCol,
                                  }));
                                  if (mappingError) setMappingError('');
                                }}
                                className="w-full sm:w-72 text-xs font-normal rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white dark:bg-slate-900 text-black dark:text-white"
                              >
                                <option value="">-- Select Source Column / Field --</option>
                                <optgroup
                                  label={`Spreadsheet Columns (${selectedDatasetName || 'Dataset'})`}
                                >
                                  {datasetColumns.map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Business & Sender Profile (Onboarding)">
                                  {businessOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {mappingError && (
                  <div className="p-2.5 rounded-lg border-2 border-black bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-red-600 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{mappingError}</span>
                  </div>
                )}
              </div>

              {/* Lead Data Analysis & WhatsApp Preview */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      WhatsApp Message Preview
                    </span>
                    {loadingPreview && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Analyzing lead data...
                      </span>
                    )}
                  </div>

                  {/* Lead Switcher */}
                  {selectedLeadsList.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Preview lead:</span>
                      <select
                        value={previewLeadId || selectedLeadsList[0]?.id}
                        onChange={(e) => setPreviewLeadId(e.target.value)}
                        className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1 max-w-[220px] truncate focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        {selectedLeadsList.map((lead, idx) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.name || `Lead ${idx + 1}`}{' '}
                            {lead.company ? `(${lead.company})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {previewLead
                        ? `Previewing for: ${previewLead.name} (${previewLead.company || selectedDatasetName || 'Dataset'})`
                        : 'Prospect Data Preview'}
                    </span>
                  )}
                </div>

                {/* Authentic WhatsApp Chat Preview */}
                <div
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] p-4 sm:p-5 flex flex-col items-center justify-center relative shadow-inner"
                  style={{
                    backgroundImage: `radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)`,
                    backgroundSize: '16px 16px',
                  }}
                >
                  <div className="max-w-md w-full bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-200/60 dark:border-white/5 space-y-1.5 text-left">
                    {/* Header text */}
                    {activeWaTemplate?.headerText && (
                      <p className="font-bold text-xs text-[#111b21] dark:text-white leading-snug">
                        {activeWaTemplate.headerText}
                      </p>
                    )}

                    {/* Formatted body message */}
                    <div className="text-[13.5px] text-[#111b21] dark:text-[#d1d7db] leading-[21px] whitespace-pre-wrap break-words font-sans">
                      {renderAnalyzedMessage(templateBody, resolvedPreview.variables)}
                    </div>

                    {/* Footer text */}
                    {activeWaTemplate?.footerText && (
                      <p className="text-[11px] text-[#667781] dark:text-[#8696a0] italic pt-0.5">
                        {activeWaTemplate.footerText}
                      </p>
                    )}

                    {/* WhatsApp Timestamp & Blue Double Checkmark */}
                    <div className="flex items-center justify-end gap-1 text-[11px] text-[#667781] dark:text-[#8696a0] pt-0.5 select-none">
                      <span>10:42 AM</span>
                      <svg
                        className="w-4 h-3.5 text-[#53bdeb]"
                        viewBox="0 0 16 11"
                        fill="currentColor"
                      >
                        <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
                      </svg>
                    </div>

                    {/* Action buttons */}
                    {Array.isArray(activeWaTemplate?.buttons) &&
                      activeWaTemplate.buttons.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-white/10 -mx-3.5 -mb-3.5 mt-2 divide-y divide-slate-100 dark:divide-white/10">
                          {activeWaTemplate.buttons.map((btn, bIdx) => (
                            <div
                              key={bIdx}
                              className="py-2 px-3 text-center text-xs font-semibold text-[#00a884] dark:text-[#25d366] flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              {btn.type === 'PHONE_NUMBER' ? (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                              ) : btn.type === 'URL' ? (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                  />
                                </svg>
                              )}
                              <span>
                                {btn.text ||
                                  (btn.type === 'PHONE_NUMBER' ? 'Call Phone' : 'Quick Reply')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 font-sans">
          <h3 className="text-sm font-semibold text-[var(--content-primary)]">
            Campaign Review & Architecture Summary
          </h3>
          <div className="divide-y divide-[var(--surface-border)] rounded-lg border border-[var(--surface-border)] overflow-hidden">
            <Row label="Campaign Name" value={name} />
            <Row
              label="Outreach Channel"
              value={
                channel === 'EMAIL_AND_WHATSAPP'
                  ? 'Email + WhatsApp'
                  : channel === 'WHATSAPP'
                    ? 'WhatsApp Only'
                    : 'Email Only'
              }
            />
            <Row label="Description" value={description || '—'} />
            <Row label="Target Dataset" value={selectedDatasetName || '—'} />
            <Row
              label="Selected Leads"
              value={`${selectedLeadIds.length} lead${selectedLeadIds.length !== 1 ? 's' : ''}`}
            />

            {/* Email-specific row */}
            {(channel === 'EMAIL' || channel === 'EMAIL_AND_WHATSAPP') && (
              <Row
                label="Email Personalization"
                value={`AI generates full personalized email (${emailTemplate || 'Cold Outreach'})`}
              />
            )}

            {/* WhatsApp-specific rows */}
            {(channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP') && (
              <>
                <Row
                  label="Approved WhatsApp Template"
                  value={`${selectedWaTemplateName} (Meta Approved)`}
                />
                <div className="px-4 py-3 bg-[var(--surface-card)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Variable Mapping Summary
                    </span>
                    <span className="text-xs text-slate-500">
                      Source Dataset: {selectedDatasetName || 'Dataset'}
                    </span>
                  </div>
                  {detectedVariables.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {detectedVariables.map((v) => {
                        const mappedCol = whatsappVariableMapping[v.index];
                        const sampleVal = previewLead
                          ? resolveCampaignTemplateVariables(
                              { [v.index]: mappedCol },
                              previewLead,
                              senderContext
                            ).variables[v.index]
                          : '';

                        const isBusinessSource = isBusinessProfileField(mappedCol);

                        return (
                          <div
                            key={v.index}
                            className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {`{{${v.index}}}`}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {mappedCol ? (
                                  <span>
                                    {mappedCol}
                                    {isBusinessSource && (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal ml-1.5">
                                        (Business Profile)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-red-500 italic">Not mapped</span>
                                )}
                              </span>
                            </div>

                            <span className="text-slate-500 font-mono text-[11px] truncate max-w-[180px]">
                              {mappedCol && sampleVal ? `"${sampleVal}"` : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No variables in this template.</p>
                  )}
                </div>
              </>
            )}

            <Row label="Status" value="Draft" />
          </div>

          {/* Missing data validation warning box */}
          {missingDataReport && missingDataReport.leadsWithMissingData.length > 0 && (
            <div className="p-3.5 rounded-xl border-2 border-black bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-2 font-bold text-sm text-red-800 dark:text-red-200">
                <svg
                  className="w-5 h-5 text-red-600 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Missing Data Warning Before Send</span>
              </div>
              <p>
                <strong>{missingDataReport.leadsWithMissingData.length}</strong> of{' '}
                <strong>{missingDataReport.totalSelected}</strong> selected leads have empty or
                missing values in mapped columns (
                {Array.from(
                  new Set(missingDataReport.leadsWithMissingData.flatMap((l) => l.missingCols))
                ).join(', ')}
                ).
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                When dispatched via Meta Cloud API, missing variables will resolve to fallback text
                or empty strings. You can still save the campaign as a Draft and update lead data in
                Lead Management.
              </p>
            </div>
          )}

          {channel === 'WHATSAPP' && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white flex items-center gap-2.5 font-sans">
              <svg
                className="w-4 h-4 text-slate-900 dark:text-white shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-slate-900 dark:text-white">
                Ready to queue. When sending, Meta Cloud API delivers the approved{' '}
                <strong className="font-sans font-bold text-slate-900 dark:text-white">
                  {selectedWaTemplateName}
                </strong>{' '}
                template with variables resolved dynamically from{' '}
                {selectedDatasetName || 'the chosen dataset'}.
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-sm text-[var(--content-primary)] text-right">{value}</span>
    </div>
  );
}
