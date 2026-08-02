import { useState, useEffect } from 'react';
import { EmailTemplateType } from '@mailflow/shared';
import { Modal, Button, Input, Textarea, Select } from '../ui';
import { LeadPickerTable } from './LeadPickerTable';
import { campaignService } from '../../services/campaign.service';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialSelectedLeadIds?: string[];
}

const STEPS = ['Details', 'Select Leads', 'Template', 'Review'];

const TEMPLATE_OPTIONS = [
  { value: '', label: 'None (No template)' },
  { value: 'Cold Outreach', label: 'Cold Outreach' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Product Demo', label: 'Product Demo' },
  { value: 'Custom Template', label: 'Custom Template' },
];

const CHANNEL_OPTIONS = [
  { value: 'EMAIL', label: 'Email Only' },
  { value: 'WHATSAPP', label: 'WhatsApp Only' },
  { value: 'EMAIL_AND_WHATSAPP', label: 'Email + WhatsApp Outreach' },
];

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
  const [templateId, setTemplateId] = useState<EmailTemplateType | ''>('');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setChannel('EMAIL');
    setSelectedLeadIds([]);
    setTemplateId('');
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
      await campaignService.createCampaign({
        name: campaignName,
        campaignName: campaignName,
        description: description.trim() || undefined,
        leadIds: selectedLeadIds,
        selectedLeadIds: selectedLeadIds,
        templateId: templateId || undefined,
        selectedTemplate: templateId || undefined,
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Campaign"
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
      {/* Step indicators */}
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
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--content-tertiary)]'
                )}
              >
                {i < step ? '✓' : i + 1}
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

      {/* Step 0: Campaign Details */}
      {step === 0 && (
        <div className="space-y-4">
          <Input
            id="campaign-name"
            label="Campaign Name *"
            placeholder="e.g. Q3 SaaS Outreach"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
            autoFocus
          />
          <Select
            id="campaign-channel"
            label="Outreach Channel"
            value={channel}
            onChange={(val) => setChannel(val as 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP')}
            options={CHANNEL_OPTIONS}
          />
          <Textarea
            id="campaign-description"
            label="Description"
            placeholder="What is this campaign about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Step 1: Select Leads */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--content-secondary)]">
            Choose which leads to include in this campaign.
          </p>
          <LeadPickerTable selectedIds={selectedLeadIds} onChange={setSelectedLeadIds} />
        </div>
      )}

      {/* Step 2: Template */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--content-secondary)]">
            Choose an email template for this campaign. If you've already generated AI emails for
            the selected leads in the Email Generation module, they will be used automatically.
          </p>
          <Select
            id="campaign-template"
            label="Email Template"
            value={templateId}
            onChange={(val) => setTemplateId(val as EmailTemplateType | '')}
            options={TEMPLATE_OPTIONS}
          />
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] p-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 mt-0.5">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <p className="text-xs text-[var(--content-secondary)]">
                Email sending happens in a future phase. This template selection helps you organize
                and preview the campaign's email format before sending.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--content-primary)]">Review Campaign</h3>
          <div className="divide-y divide-[var(--surface-border)] rounded-lg border border-[var(--surface-border)] overflow-hidden">
            <Row label="Campaign Name" value={name} />
            <Row label="Description" value={description || '—'} />
            <Row
              label="Selected Leads"
              value={`${selectedLeadIds.length} lead${selectedLeadIds.length !== 1 ? 's' : ''}`}
            />
            <Row label="Template" value={templateId || 'None'} />
            <Row label="Status" value="Draft" />
          </div>
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
