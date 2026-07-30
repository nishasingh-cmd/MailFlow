import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CampaignDetail as CampaignDetailType,
  CampaignStatus,
  CampaignProgress,
  CompletionSummaryData,
} from '@mailflow/shared';
import { campaignService } from '../../services/campaign.service';
import { deliveryService } from '../../services/delivery.service';
import { useToast } from '../../hooks/useToast';
import { Button, Badge, Skeleton } from '../../components/ui';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { EditCampaignModal } from '../../components/campaigns/EditCampaignModal';
import { DeleteCampaignModal } from '../../components/campaigns/DeleteCampaignModal';
import { CampaignSendModal } from '../../components/campaigns/CampaignSendModal';
import { CompletionSummaryModal } from '../../components/campaigns/CompletionSummaryModal';

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
  const [sendOpen, setSendOpen] = useState(false);

  // Live progress & summary state
  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [summaryData, setSummaryData] = useState<CompletionSummaryData | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await campaignService.getCampaignById(id);
      setCampaign(data);
      if (['QUEUED', 'SENDING', 'PAUSED'].includes(data.status)) {
        const p = await deliveryService.getProgress(id);
        setProgress(p);
      }
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

  // Live Auto-Polling while Campaign is Queued, Sending, or Paused
  const pollProgress = useCallback(async () => {
    if (!id || !campaign) return;
    if (!['QUEUED', 'SENDING', 'PAUSED'].includes(campaign.status)) return;

    try {
      const p = await deliveryService.getProgress(id);
      setProgress(p);

      // Status change detection & notifications
      if (prevStatusRef.current && prevStatusRef.current !== p.status) {
        if (p.status === 'SENDING') {
          toast.info('🚀 Sending started...');
        } else if (p.status === 'PAUSED') {
          toast.warning('⏸ Campaign paused.');
        } else if (p.status === 'COMPLETED' || p.status === 'COMPLETED_WITH_ERRORS') {
          toast.success('🎉 Campaign completed successfully!');
          setSummaryData({
            campaignId: campaign.id,
            campaignName: campaign.name,
            total: p.total,
            sent: p.sent,
            failed: p.failed,
            timeTaken: p.timeTaken || '—',
            successRate: p.successRate ?? 100,
          });
          setSummaryOpen(true);
          loadCampaign();
        }
      }
      prevStatusRef.current = p.status;

      // Update campaign status if changed on backend
      if (p.status !== campaign.status) {
        setCampaign((c) => (c ? { ...c, status: p.status as CampaignStatus } : c));
      }
    } catch {
      // ignore transient poll error
    }
  }, [id, campaign, toast, loadCampaign]);

  useEffect(() => {
    if (campaign && ['QUEUED', 'SENDING', 'PAUSED'].includes(campaign.status)) {
      pollProgress();
      const interval = setInterval(pollProgress, 2500);
      return () => clearInterval(interval);
    }
  }, [campaign, pollProgress]);

  const handlePause = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const p = await deliveryService.pauseSending(id);
      setProgress(p);
      setCampaign((c) => (c ? { ...c, status: 'PAUSED' } : c));
      toast.info('Campaign paused.');
    } catch {
      toast.error('Failed to pause campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const p = await deliveryService.resumeSending(id);
      setProgress(p);
      setCampaign((c) => (c ? { ...c, status: 'SENDING' } : c));
      toast.success('Campaign resumed.');
    } catch {
      toast.error('Failed to resume campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const p = await deliveryService.cancelSending(id);
      setProgress(p);
      setCampaign((c) => (c ? { ...c, status: 'CANCELLED' } : c));
      toast.warning('Campaign sending cancelled.');
    } catch {
      toast.error('Failed to cancel campaign.');
    } finally {
      setActionLoading(false);
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

  const isQueueActive = ['QUEUED', 'SENDING', 'PAUSED'].includes(campaign.status);

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
            {!isQueueActive &&
              campaign.status !== 'COMPLETED' &&
              campaign.status !== 'COMPLETED_WITH_ERRORS' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSendOpen(true)}
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  }
                >
                  Send Campaign
                </Button>
              )}

            {campaign.status === 'SENDING' && (
              <>
                <Button variant="outline" size="sm" onClick={handlePause} loading={actionLoading}>
                  Pause Campaign
                </Button>
                <Button variant="danger" size="sm" onClick={handleCancel} loading={actionLoading}>
                  Cancel Campaign
                </Button>
              </>
            )}

            {campaign.status === 'PAUSED' && (
              <>
                <Button variant="primary" size="sm" onClick={handleResume} loading={actionLoading}>
                  Resume Campaign
                </Button>
                <Button variant="danger" size="sm" onClick={handleCancel} loading={actionLoading}>
                  Cancel Campaign
                </Button>
              </>
            )}

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

      {/* Live Sending Progress Panel */}
      {isQueueActive && progress && (
        <div className="rounded-xl border border-brand-500/30 bg-[var(--surface-card)] p-5 space-y-4 shadow-elevation-2 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-brand-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--content-primary)]">
                  Live Sending Progress
                </h3>
                <p className="text-xs text-[var(--content-secondary)]">
                  {progress.status === 'SENDING'
                    ? 'Processing email queue in real time...'
                    : `Status: ${progress.status}`}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-brand-400">
              {progress.percentage}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-[var(--surface-elevated)] overflow-hidden p-0.5 border border-[var(--surface-border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue-400 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]">
              <span className="text-[var(--content-tertiary)] uppercase font-semibold">Sent</span>
              <p className="text-lg font-bold text-green-400 mt-0.5">
                {progress.sent} / {progress.total}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]">
              <span className="text-[var(--content-tertiary)] uppercase font-semibold">
                Remaining
              </span>
              <p className="text-lg font-bold text-blue-400 mt-0.5">{progress.pending}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]">
              <span className="text-[var(--content-tertiary)] uppercase font-semibold">Failed</span>
              <p className="text-lg font-bold text-red-400 mt-0.5">{progress.failed}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]">
              <span className="text-[var(--content-tertiary)] uppercase font-semibold">
                Current Recipient
              </span>
              <p className="text-xs font-mono text-[var(--content-primary)] truncate mt-1">
                {progress.currentRecipient || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--content-tertiary)] tracking-wider">
            Total Leads
          </p>
          <p className="text-2xl font-bold text-[var(--content-primary)] mt-1">
            {campaign.campaignLeads.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--content-tertiary)] tracking-wider">
            Template
          </p>
          <p className="text-2xl font-bold text-[var(--content-primary)] mt-1">
            {campaign.templateId || 'None'}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--content-tertiary)] tracking-wider">
            AI Email Drafts
          </p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {campaign.campaignLeads.filter((cl) => (cl.lead?.emailDrafts?.length ?? 0) > 0).length}{' '}
            / {campaign.campaignLeads.length}
          </p>
        </div>
      </div>

      {/* Main Grid: Details + Leads Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Info */}
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 space-y-3">
          <h2 className="text-base font-semibold text-[var(--content-primary)] border-b border-[var(--surface-border)] pb-3">
            Campaign Information
          </h2>
          <InfoRow label="Campaign Name">{campaign.name}</InfoRow>
          <InfoRow label="Status">
            <CampaignStatusBadge status={campaign.status} size="sm" />
          </InfoRow>
          <InfoRow label="Template">{campaign.templateId || '—'}</InfoRow>
          <InfoRow label="Created">{formatDate(campaign.createdAt)}</InfoRow>
          <InfoRow label="Last Updated">{formatDateTime(campaign.updatedAt)}</InfoRow>
        </div>

        {/* Selected Leads */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--content-primary)]">
              Campaign Leads ({campaign.campaignLeads.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
              Manage Leads
            </Button>
          </div>

          {campaign.campaignLeads.length === 0 ? (
            <p className="text-sm text-[var(--content-tertiary)] py-6 text-center">
              No leads added to this campaign yet. Edit the campaign to add leads.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                      Name & Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                      Company
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase">
                      AI Draft
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                  {campaign.campaignLeads.map((cl) => {
                    const lead = cl.lead;
                    const hasDraft = (lead?.emailDrafts?.length ?? 0) > 0;
                    return (
                      <tr
                        key={cl.leadId}
                        className="hover:bg-[var(--surface-elevated)] transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-[var(--content-primary)]">{lead?.name}</p>
                          <p className="text-xs text-[var(--content-tertiary)]">{lead?.email}</p>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--content-secondary)]">
                          {lead?.company || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={hasDraft ? 'success' : 'neutral'} size="sm">
                            {hasDraft ? 'Ready' : 'Not generated'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

      <CampaignSendModal
        open={sendOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
        onClose={() => setSendOpen(false)}
        onStatusChanged={() => loadCampaign()}
      />

      <CompletionSummaryModal
        open={summaryOpen}
        summary={summaryData}
        onClose={() => setSummaryOpen(false)}
        onViewLogs={() => {
          setSummaryOpen(false);
          navigate(`/delivery-logs?campaignId=${campaign.id}`);
        }}
      />
    </div>
  );
}
