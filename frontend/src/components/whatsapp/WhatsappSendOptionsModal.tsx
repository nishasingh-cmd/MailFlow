import { useState } from 'react';
import { Modal, Button } from '../ui';
import { whatsappService } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';

interface WhatsappSendOptionsModalProps {
  open: boolean;
  selectedLeadIds?: string[];
  campaignId?: string;
  totalLeadsCount?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WhatsappSendOptionsModal({
  open,
  selectedLeadIds = [],
  campaignId,
  totalLeadsCount = 0,
  onClose,
  onSuccess,
}: WhatsappSendOptionsModalProps) {
  const { toast } = useToast();

  const [mode, setMode] = useState<'selected' | 'all'>('selected');
  const [loading, setLoading] = useState(false);

  const selectedCount = selectedLeadIds.length;

  const handleSendBatch = async () => {
    setLoading(true);
    try {
      if (mode === 'selected') {
        if (selectedCount === 0) {
          toast.warning('Please select at least one lead first.');
          setLoading(false);
          return;
        }
        const res = await whatsappService.sendMessages({
          leadIds: selectedLeadIds,
          campaignId,
        });
        toast.success(`💬 ${res.message || `Queued ${res.count} WhatsApp outreach messages!`}`);
      } else {
        const res = await whatsappService.sendMessages({
          campaignId,
          sendAll: !campaignId,
        });
        toast.success(`💬 ${res.message || 'Queued WhatsApp messages for all leads!'}`);
      }

      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to queue WhatsApp messages.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Batch Dispatch Options" size="md">
      <div className="space-y-6 py-2">
        <p className="text-sm text-[var(--content-secondary)]">
          Choose how many recipients should receive AI-personalized WhatsApp outreach messages:
        </p>

        <div className="space-y-3">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'selected'
                ? 'border-brand-500/50 bg-brand-500/10'
                : 'border-[var(--surface-border)] bg-[var(--surface-elevated)]'
            }`}
            onClick={() => setMode('selected')}
          >
            <input
              type="radio"
              checked={mode === 'selected'}
              onChange={() => setMode('selected')}
              name="mode"
              className="mt-1"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--content-primary)]">
                Send Selected Leads ({selectedCount})
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                Only send WhatsApp messages to the {selectedCount} currently highlighted lead(s).
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'all'
                ? 'border-brand-500/50 bg-brand-500/10'
                : 'border-[var(--surface-border)] bg-[var(--surface-elevated)]'
            }`}
            onClick={() => setMode('all')}
          >
            <input
              type="radio"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              name="mode"
              className="mt-1"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--content-primary)]">
                Send All Leads ({totalLeadsCount > 0 ? totalLeadsCount : 'All'})
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                Automatically generate and queue WhatsApp messages for all target leads.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendBatch}
            loading={loading}
            disabled={loading || (mode === 'selected' && selectedCount === 0)}
          >
            {loading ? 'Queueing WhatsApp...' : 'Start Batch Dispatch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
