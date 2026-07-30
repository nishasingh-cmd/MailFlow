import { Campaign } from '@mailflow/shared';
import { Modal, Button } from '../ui';
import { campaignService } from '../../services/campaign.service';
import { useState } from 'react';

interface DeleteCampaignModalProps {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteCampaignModal({
  open,
  campaign,
  onClose,
  onDeleted,
}: DeleteCampaignModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!campaign) return;
    setDeleting(true);
    try {
      await campaignService.deleteCampaign(campaign.id);
      onDeleted();
      onClose();
    } catch {
      // handled by parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Campaign"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={deleting}>
            Delete Campaign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-400"
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
        </div>
        <p className="text-sm text-[var(--content-secondary)] text-center">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-[var(--content-primary)]">"{campaign?.name}"</span>?
        </p>
        <p className="text-xs text-[var(--content-tertiary)] text-center">
          This action cannot be undone. Your leads will not be affected.
        </p>
      </div>
    </Modal>
  );
}
