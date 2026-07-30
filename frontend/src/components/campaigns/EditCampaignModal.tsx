import { useState, useEffect } from 'react';
import { Campaign } from '@mailflow/shared';
import { Modal, Button, Input, Textarea, Select } from '../ui';
import { LeadPickerTable } from './LeadPickerTable';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { campaignService } from '../../services/campaign.service';
import { cn } from '../../utils/cn';

interface EditCampaignModalProps {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
];

const TEMPLATE_OPTIONS = [
  { value: '', label: 'None (No template)' },
  { value: 'Cold Outreach', label: 'Cold Outreach' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Product Demo', label: 'Product Demo' },
  { value: 'Custom Template', label: 'Custom Template' },
];

type EditTab = 'details' | 'leads' | 'settings';

export function EditCampaignModal({ open, campaign, onClose, onUpdated }: EditCampaignModalProps) {
  const [tab, setTab] = useState<EditTab>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load campaign detail (to get existing lead IDs)
  useEffect(() => {
    if (open && campaign) {
      setName(campaign.name);
      setDescription(campaign.description ?? '');
      setTemplateId(campaign.templateId ?? '');
      setStatus(campaign.status);
      setTab('details');
      setNameError('');

      setLoadingDetail(true);
      campaignService
        .getCampaignById(campaign.id)
        .then((d) => {
          setSelectedLeadIds(d.campaignLeads.map((cl) => cl.leadId));
        })
        .catch(() => setSelectedLeadIds([]))
        .finally(() => setLoadingDetail(false));
    }
  }, [open, campaign]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Campaign name is required');
      setTab('details');
      return;
    }
    if (!campaign) return;

    setSubmitting(true);
    try {
      await campaignService.updateCampaign(campaign.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        leadIds: selectedLeadIds,
        templateId: templateId || undefined,
        status: status as Campaign['status'],
      });
      onUpdated();
      handleClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: EditTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'leads', label: `Leads (${selectedLeadIds.length})` },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Edit: ${campaign?.name ?? 'Campaign'}`}
      size="xl"
      persistent
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={submitting} disabled={submitting}>
            Save Changes
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--surface-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          <Input
            id="edit-campaign-name"
            label="Campaign Name *"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
          />
          <Textarea
            id="edit-campaign-description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this campaign about?"
          />
        </div>
      )}

      {tab === 'leads' && (
        <div className="space-y-3">
          {loadingDetail ? (
            <div className="text-sm text-[var(--content-tertiary)]">Loading leads...</div>
          ) : (
            <LeadPickerTable selectedIds={selectedLeadIds} onChange={setSelectedLeadIds} />
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <Select
            id="edit-campaign-template"
            label="Email Template"
            value={templateId}
            onChange={(val) => setTemplateId(val)}
            options={TEMPLATE_OPTIONS}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--content-primary)]">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    status === opt.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-[var(--surface-border)] text-[var(--content-secondary)] hover:border-[var(--surface-hover)]'
                  )}
                >
                  <CampaignStatusBadge status={opt.value as Campaign['status']} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
