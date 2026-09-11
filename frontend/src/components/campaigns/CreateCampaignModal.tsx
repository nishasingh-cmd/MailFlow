import { useState, useEffect } from 'react';
import { EmailTemplateType } from '@mailflow/shared';
import { Modal, Button, Input, Textarea, Select, Badge } from '../ui';
import { LeadPickerTable } from './LeadPickerTable';
import { campaignService } from '../../services/campaign.service';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
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

interface VariableInfo {
  label: string;
  field: string;
  sample: string;
}

function getVariableInfo(num: string): VariableInfo {
  switch (num) {
    case '1':
      return { label: 'Lead Full Name', field: 'lead.fullName', sample: 'Dr. Rahul' };
    case '2':
      return { label: 'Company / Clinic', field: 'lead.company', sample: 'Sharma Dental Clinic' };
    case '3':
      return {
        label: 'Industry / Specialization',
        field: 'lead.industry',
        sample: 'Dental Practice',
      };
    default:
      return {
        label: `Custom Field {{${num}}}`,
        field: `lead.field_${num}`,
        sample: `Lead Value ${num}`,
      };
  }
}

function renderHighlightedMessage(templateText: string) {
  const sampleMap: Record<string, string> = {
    '1': 'Dr. Rahul',
    '2': 'Sharma Dental Clinic',
    '3': 'Dental Practice',
  };

  const parts = templateText.split(/(\{\{\s*\d+\s*\}\})/g);
  return parts.map((part, index) => {
    const match = part.match(/\{\{\s*(\d+)\s*\}\}/);
    if (match) {
      const varNum = match[1];
      const sampleVal = sampleMap[varNum] || `[Custom Value ${varNum}]`;
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded font-bold text-sm font-sans bg-slate-100 text-slate-900 dark:bg-slate-700/80 dark:text-slate-100 border border-slate-300 dark:border-slate-600 mx-0.5 align-baseline"
          title={`Variable {{${varNum}}} populated by MailFlow AI`}
        >
          {sampleVal}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
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

  useEffect(() => {
    if (open && initialSelectedLeadIds && initialSelectedLeadIds.length > 0) {
      setSelectedLeadIds(initialSelectedLeadIds);
    }
  }, [open, initialSelectedLeadIds]);

  // Email template state
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType | ''>('Cold Outreach');

  // WhatsApp Meta template state
  const [waTemplates, setWaTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [loadingWaTemplates, setLoadingWaTemplates] = useState(false);
  const [selectedWaTemplateName, setSelectedWaTemplateName] = useState<string>('cold_outreach');

  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
            // Fallback default template if no WABA templates fetched yet
            setWaTemplates([
              {
                name: 'cold_outreach',
                language: 'en',
                status: 'APPROVED',
                bodyText:
                  "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!",
              },
            ]);
            setSelectedWaTemplateName('cold_outreach');
          }
        })
        .catch(() => {
          setWaTemplates([
            {
              name: 'cold_outreach',
              language: 'en',
              status: 'APPROVED',
              bodyText:
                "Hello {{1}}, I came across {{2}} and wanted to reach out regarding our services. Let me know if you'd be open to a quick 5-minute chat!",
            },
          ]);
          setSelectedWaTemplateName('cold_outreach');
        })
        .finally(() => setLoadingWaTemplates(false));
    }
  }, [open, channel]);

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setChannel('EMAIL');
    setSelectedLeadIds([]);
    setEmailTemplate('Cold Outreach');
    setSelectedWaTemplateName('cold_outreach');
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

  const detectedVariables = Array.from(
    new Set(Array.from(templateBody.matchAll(/\{\{\s*(\d+)\s*\}\}/g), (m) => m[1]))
  ).sort((a, b) => Number(a) - Number(b));

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
            placeholder="e.g. Q3 Healthcare Outreach"
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
                    ? 'border-amber-500 bg-amber-500/10 shadow-elevation-1'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-amber-500/40'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <svg
                      className="w-5 h-5 text-amber-500"
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
                      variant={channel === 'EMAIL_AND_WHATSAPP' ? 'warning' : 'neutral'}
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
                <div className="pt-2 border-t border-[var(--surface-border)] text-xs text-amber-400/80">
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
        <div className="space-y-3">
          <p className="text-sm text-[var(--content-secondary)]">
            Choose which leads to include in this campaign.
          </p>
          <LeadPickerTable selectedIds={selectedLeadIds} onChange={setSelectedLeadIds} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {/* EMAIL CHANNEL TEMPLATE & SETUP */}
          {(channel === 'EMAIL' || channel === 'EMAIL_AND_WHATSAPP') && (
            <div className="p-4 rounded-xl border border-brand-500/30 bg-[var(--surface-card)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--content-primary)]">
                    Email Campaign — Full AI Message Generation
                  </h4>
                </div>
                <Badge variant="brand" size="sm">
                  Full AI Generation
                </Badge>
              </div>

              <p className="text-xs text-[var(--content-secondary)] leading-relaxed">
                For email outreach, AI researches each lead to generate a complete, custom email
                including subject, opening, body, and CTA. You can preview and edit every draft.
              </p>

              <Select
                id="campaign-email-template"
                label="Base Email Framework / Tone"
                value={emailTemplate}
                onChange={(val) => setEmailTemplate(val as EmailTemplateType | '')}
                options={EMAIL_TEMPLATE_OPTIONS}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-[var(--surface-border)] font-sans">
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-slate-900 dark:text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-900 dark:text-white">Company research</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-slate-900 dark:text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-900 dark:text-white">Lead context</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-slate-900 dark:text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-900 dark:text-white">Full email body</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-slate-900 dark:text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-900 dark:text-white">Personalized CTA</span>
                </div>
              </div>
            </div>
          )}

          {/* WHATSAPP CHANNEL TEMPLATE & SETUP */}
          {(channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP') && (
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)] space-y-5 font-sans">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--surface-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.02L7.55 18.84L4.43 19.66L5.26 16.61L5.06 16.3C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.9 12.04 8.02 12.2C8.14 12.36 9.74 14.83 12.19 15.89C12.78 16.14 13.23 16.29 13.59 16.41C14.18 16.6 14.71 16.57 15.14 16.51C15.62 16.44 16.61 15.91 16.82 15.33C17.02 14.75 17.02 14.25 16.96 14.15C16.9 14.05 16.74 13.99 16.5 13.87C16.26 13.75 15.08 13.17 14.86 13.09C14.64 13.01 14.48 12.97 14.32 13.21C14.16 13.45 13.7 13.99 13.56 14.15C13.42 14.31 13.28 14.33 13.04 14.21C12.8 14.09 11.79 13.76 10.59 12.69C9.66 11.86 9.03 10.83 8.91 10.63C8.79 10.43 8.9 10.32 9.02 10.2C9.13 10.09 9.27 9.91 9.39 9.77C9.51 9.63 9.55 9.53 9.63 9.37C9.71 9.21 9.67 9.07 9.61 8.95C9.55 8.83 9.07 7.66 8.88 7.18C8.68 6.72 8.48 6.78 8.33 6.78C8.18 6.77 8.02 6.77 7.86 6.77L8.53 7.33Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                      WhatsApp Template & AI Setup
                    </h4>
                    <p className="text-xs text-[var(--content-secondary)] font-sans">
                      Meta Cloud API Approved Messaging
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-slate-900 dark:text-white">Meta Cloud API Connected</span>
                </div>
              </div>

              {/* Meta Compliance Architecture Note */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white flex items-start gap-2.5 leading-relaxed font-sans">
                <svg
                  className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-slate-900 dark:text-white">
                  <strong className="font-bold text-slate-900 dark:text-white">
                    Meta Compliance Rule:
                  </strong>{' '}
                  Outbound WhatsApp outreach must use pre-approved Meta templates. MailFlow's AI
                  automatically populates template placeholders (e.g. Lead Name, Company, Industry)
                  while preserving 100% Meta policy approval.
                </span>
              </div>

              {loadingWaTemplates ? (
                <div className="py-8 text-center text-sm text-slate-900 dark:text-white flex flex-col items-center justify-center gap-2 font-sans">
                  <div className="w-5 h-5 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-900 dark:text-white">
                    Loading approved templates from Meta WABA...
                  </span>
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {/* Template Selection Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                        Select Approved Meta Template
                      </label>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans">
                        {waTemplates.length} template{waTemplates.length !== 1 ? 's' : ''} available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {waTemplates.map((tpl) => {
                        const isSelected = selectedWaTemplateName === tpl.name;
                        return (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => setSelectedWaTemplateName(tpl.name)}
                            className={cn(
                              'p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2.5 group cursor-pointer font-sans',
                              isSelected
                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/30 ring-2 ring-blue-500/25 shadow-xs'
                                : 'border-[var(--surface-border)] bg-[var(--surface-card)] hover:border-blue-500/40 hover:bg-[var(--surface-elevated)]'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 w-full">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={cn(
                                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-blue-400'
                                  )}
                                >
                                  {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </span>
                                <span className="font-sans text-sm font-semibold truncate text-slate-900 dark:text-white">
                                  {tpl.name}
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-sans">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                <span className="text-slate-900 dark:text-white">{tpl.status}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 pl-6.5 font-sans">
                              <span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  Lang:
                                </span>{' '}
                                {tpl.language}
                              </span>
                              <span className="text-[var(--surface-border)]">|</span>
                              <span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  Category:
                                </span>{' '}
                                Marketing
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Variable Personalization Mapping */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                        AI Variable Personalization
                      </span>
                      {detectedVariables.length > 0 && (
                        <span className="text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded font-semibold border border-slate-200 dark:border-slate-700 font-sans">
                          {detectedVariables.length} variable
                          {detectedVariables.length > 1 ? 's' : ''} auto-mapped
                        </span>
                      )}
                    </div>

                    {detectedVariables.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {detectedVariables.map((varNum) => {
                          const info = getVariableInfo(varNum);
                          return (
                            <div
                              key={varNum}
                              className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] space-y-1.5 font-sans"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-sm font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                                  {`{{${varNum}}}`}
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-sans font-medium">
                                  {info.field}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans font-medium">
                                  {info.label}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-slate-900 dark:text-white font-sans">
                                  <span className="text-xs text-slate-900 dark:text-white font-bold">
                                    AI →
                                  </span>
                                  <span className="truncate text-slate-900 dark:text-white">
                                    {info.sample}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] flex items-center gap-2.5 text-sm text-slate-900 dark:text-white font-sans">
                        <svg
                          className="w-4 h-4 text-slate-900 dark:text-white shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-slate-900 dark:text-white">
                          <strong className="font-bold text-slate-900 dark:text-white">
                            Static Meta Template:
                          </strong>{' '}
                          This template contains no variable placeholders ({'{{1}}'}). The verified
                          Meta message will be dispatched directly to your recipients.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recipient Live Preview (Authentic WhatsApp Chatbox) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                        Recipient Live Preview
                      </span>
                      <span className="text-xs text-slate-900 dark:text-white font-medium flex items-center gap-1.5 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-slate-900 dark:text-white">
                          Meta Cloud API Delivery
                        </span>
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[var(--surface-border)] overflow-hidden shadow-xs bg-[#efeae2] dark:bg-[#0b141a] p-4 sm:p-6 font-sans flex items-center justify-center">
                      <div className="max-w-md w-full bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-4 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/50 dark:border-white/5 space-y-2 text-left font-sans">
                        <div className="text-sm text-[#111b21] dark:text-[#d1d7db] leading-relaxed whitespace-pre-wrap break-words font-sans">
                          {renderHighlightedMessage(templateBody)}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 text-xs text-[#667781] dark:text-[#8696a0] pt-1 select-none font-sans">
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
                </div>
              )}
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
                <Row
                  label="WhatsApp AI Scope"
                  value="Personalizes variables only ({{1}}, {{2}}). Message structure defined by Meta template."
                />
              </>
            )}

            <Row label="Status" value="Draft" />
          </div>

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
                template with AI-populated variables for each lead.
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
