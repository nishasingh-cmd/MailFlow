import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CampaignDetail as CampaignDetailType, CampaignStatus } from '@mailflow/shared';
import { campaignService } from '../../services/campaign.service';
import { useToast } from '../../hooks/useToast';
import { Button, Badge, Skeleton } from '../../components/ui';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { EditCampaignModal } from '../../components/campaigns/EditCampaignModal';
import { DeleteCampaignModal } from '../../components/campaigns/DeleteCampaignModal';

const STATUS_FLOW: CampaignStatus[] = ['DRAFT', 'READY', 'COMPLETED'];
const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  COMPLETED: 'Completed',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--surface-border)] last:border-0">
      <span className="text-sm font-medium text-[var(--content-secondary)] min-w-[120px]">
        {label}
      </span>
      <span className="text-sm text-[var(--content-primary)] text-right">{children}</span>
    </div>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<CampaignDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await campaignService.getCampaignById(id);
      setCampaign(data);
    } catch {
      toast.error('Campaign not found');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!campaign || newStatus === campaign.status) return;
    setUpdatingStatus(true);
    try {
      await campaignService.updateCampaign(campaign.id, { status: newStatus });
      setCampaign((c) => (c ? { ...c, status: newStatus } : c));
      toast.success(`Status changed to ${STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="text" className="w-48 h-7" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!campaign) return null;

  const currentStatusIdx = STATUS_FLOW.indexOf(campaign.status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb + Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            {campaign.description && (
              <p className="text-sm text-[var(--content-secondary)]">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditOpen(true)}
              leftIcon={
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              }
            >
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--content-primary)] mb-4">
          Campaign Status
        </h2>
        <div className="flex items-center gap-0">
          {STATUS_FLOW.map((status, i) => {
            const isPast = i < currentStatusIdx;
            const isCurrent = i === currentStatusIdx;
            const isNext = i === currentStatusIdx + 1;

            return (
              <div key={status} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => (isNext ? handleStatusChange(status) : undefined)}
                  disabled={updatingStatus || !isNext}
                  className={`flex flex-col items-center gap-1.5 cursor-${isNext ? 'pointer' : 'default'} transition-all group`}
                  title={isNext ? `Mark as ${STATUS_LABELS[status]}` : undefined}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isPast ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-brand-500 text-white ring-4 ring-brand-500/20' : ''}
                    ${!isPast && !isCurrent ? 'bg-[var(--surface-elevated)] text-[var(--content-tertiary)] group-hover:bg-[var(--surface-hover)]' : ''}
                  `}
                  >
                    {isPast ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${isCurrent ? 'text-brand-400' : isPast ? 'text-green-400' : 'text-[var(--content-tertiary)]'}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </button>
                {i < STATUS_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 ${i < currentStatusIdx ? 'bg-green-500/40' : 'bg-[var(--surface-border)]'}`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {campaign.status !== 'COMPLETED' && (
          <p className="text-xs text-[var(--content-tertiary)] mt-3">
            Click the next step to advance the campaign status.
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: campaign.campaignLeads.length, icon: '👥' },
          { label: 'Template', value: campaign.templateId ?? 'None', icon: '📋' },
          { label: 'Created', value: formatDate(campaign.createdAt), icon: '📅' },
          { label: 'Last Updated', value: formatDate(campaign.updatedAt), icon: '🔄' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4"
          >
            <p className="text-lg mb-1">{card.icon}</p>
            <p className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-sm font-semibold text-[var(--content-primary)] mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign Information */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--content-primary)] mb-4">
          Campaign Information
        </h2>
        <div>
          <InfoRow label="Name">{campaign.name}</InfoRow>
          <InfoRow label="Description">
            {campaign.description ?? (
              <span className="text-[var(--content-tertiary)]">No description</span>
            )}
          </InfoRow>
          <InfoRow label="Status">
            <CampaignStatusBadge status={campaign.status} size="sm" />
          </InfoRow>
          <InfoRow label="Template">
            {campaign.templateId ?? <span className="text-[var(--content-tertiary)]">None</span>}
          </InfoRow>
          <InfoRow label="Created">{formatDateTime(campaign.createdAt)}</InfoRow>
          <InfoRow label="Updated">{formatDateTime(campaign.updatedAt)}</InfoRow>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)]">
          <h2 className="text-sm font-semibold text-[var(--content-primary)]">
            Selected Leads
            <span className="ml-2 text-[var(--content-tertiary)] font-normal">
              ({campaign.campaignLeads.length})
            </span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            Manage Leads
          </Button>
        </div>

        {campaign.campaignLeads.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--content-tertiary)]">
            No leads selected. Click "Edit" to add leads.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden lg:table-cell">
                    AI Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {campaign.campaignLeads.map((cl) => {
                  const lead = cl.lead;
                  if (!lead) return null;
                  const draft = lead.emailDrafts?.[0];
                  return (
                    <tr
                      key={cl.leadId}
                      className="hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--content-primary)]">
                        {lead.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--content-secondary)] hidden sm:table-cell">
                        {lead.email}
                      </td>
                      <td className="px-4 py-3 text-[var(--content-secondary)] hidden md:table-cell">
                        {lead.company ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            lead.status === 'NEW'
                              ? 'brand'
                              : lead.status === 'CONTACTED'
                                ? 'info'
                                : lead.status === 'QUALIFIED'
                                  ? 'success'
                                  : lead.status === 'UNSUBSCRIBED'
                                    ? 'warning'
                                    : 'error'
                          }
                          size="sm"
                        >
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {draft ? (
                          <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--content-tertiary)]">
                            Not generated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Preview Section */}
      {campaign.campaignLeads.some((cl) => cl.lead?.emailDrafts?.[0]) && (
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--surface-border)]">
            <h2 className="text-sm font-semibold text-[var(--content-primary)]">Email Previews</h2>
            <p className="text-xs text-[var(--content-secondary)] mt-0.5">
              AI-generated emails attached to leads in this campaign.
            </p>
          </div>
          <div className="p-5 space-y-4 max-h-80 overflow-y-auto scrollbar-none">
            {campaign.campaignLeads
              .filter((cl) => cl.lead?.emailDrafts?.[0])
              .slice(0, 3)
              .map((cl) => {
                const draft = cl.lead!.emailDrafts![0];
                return (
                  <div
                    key={cl.leadId}
                    className="rounded-lg border border-[var(--surface-border)] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[var(--content-primary)]">
                        {cl.lead!.name}
                      </p>
                      <Badge variant="brand" size="sm">
                        {draft.template}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-[var(--content-secondary)]">
                      Subject: {draft.subject}
                    </p>
                    <p className="text-xs text-[var(--content-tertiary)] line-clamp-3">
                      {draft.body}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modals */}
      <EditCampaignModal
        open={editOpen}
        campaign={campaign}
        onClose={() => setEditOpen(false)}
        onUpdated={() => {
          toast.success('Campaign updated');
          setEditOpen(false);
          loadCampaign();
        }}
      />

      <DeleteCampaignModal
        open={deleteOpen}
        campaign={campaign}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          toast.success('Campaign deleted');
          navigate('/campaigns');
        }}
      />
    </div>
  );
}
