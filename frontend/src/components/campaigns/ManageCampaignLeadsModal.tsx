import { useState, useMemo } from 'react';
import { CampaignDetail, Lead } from '@mailflow/shared';
import { Modal, Button, Input } from '../ui';
import { LeadPickerTable } from './LeadPickerTable';
import { campaignService } from '../../services/campaign.service';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

interface ManageCampaignLeadsModalProps {
  open: boolean;
  campaign: CampaignDetail | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ManageCampaignLeadsModal({
  open,
  campaign,
  onClose,
  onUpdated,
}: ManageCampaignLeadsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');
  const [search, setSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const assignedLeads: Lead[] = useMemo(() => {
    if (!campaign?.campaignLeads) return [];
    return campaign.campaignLeads.map((cl) => cl.lead).filter(Boolean) as Lead[];
  }, [campaign?.campaignLeads]);

  const assignedLeadIds = useMemo(() => {
    return new Set(assignedLeads.map((l) => l.id));
  }, [assignedLeads]);

  const filteredAssignedLeads = useMemo(() => {
    if (!search.trim()) return assignedLeads;
    const q = search.toLowerCase();
    return assignedLeads.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q)
    );
  }, [assignedLeads, search]);

  const handleRemoveSingle = async (leadId: string, leadName?: string) => {
    if (!campaign) return;
    setRemovingId(leadId);
    try {
      await campaignService.removeLeadFromCampaign(campaign.id, leadId);
      toast.success(leadName ? `Removed ${leadName} from campaign` : 'Lead removed from campaign');
      onUpdated();
    } catch {
      toast.error('Failed to remove lead from campaign');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveSelected = async () => {
    if (!campaign || selectedToRemove.length === 0) return;
    setLoading(true);
    try {
      await campaignService.removeLeadsFromCampaign(campaign.id, selectedToRemove);
      toast.success(`Removed ${selectedToRemove.length} leads from campaign`);
      setSelectedToRemove([]);
      onUpdated();
    } catch {
      toast.error('Failed to remove selected leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelected = async () => {
    if (!campaign || selectedToAdd.length === 0) return;
    setLoading(true);
    try {
      await campaignService.addLeadsToCampaign(campaign.id, selectedToAdd);
      toast.success(`Added ${selectedToAdd.length} leads to campaign`);
      setSelectedToAdd([]);
      setActiveTab('current');
      onUpdated();
    } catch {
      toast.error('Failed to add leads to campaign');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRemove = (id: string) => {
    setSelectedToRemove((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRemove = () => {
    if (selectedToRemove.length === filteredAssignedLeads.length) {
      setSelectedToRemove([]);
    } else {
      setSelectedToRemove(filteredAssignedLeads.map((l) => l.id));
    }
  };

  if (!campaign) return null;

  return (
    <Modal open={open} onClose={onClose} title="Manage Campaign Leads" size="xl">
      <div className="space-y-4 font-sans">
        {/* Header Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'current'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Assigned Leads ({assignedLeads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'add'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              + Add More Leads {selectedToAdd.length > 0 && `(${selectedToAdd.length})`}
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Campaign: <strong className="text-slate-900 dark:text-white">{campaign.name}</strong>
          </p>
        </div>

        {/* Tab 1: Current Assigned Leads */}
        {activeTab === 'current' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="w-full sm:w-72">
                <Input
                  id="search-assigned-leads"
                  placeholder="Search assigned leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs py-1.5"
                />
              </div>

              {selectedToRemove.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemoveSelected}
                  disabled={loading}
                >
                  {loading ? 'Removing...' : `Remove Selected (${selectedToRemove.length})`}
                </Button>
              )}
            </div>

            {filteredAssignedLeads.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {search ? 'No matching leads found' : 'No leads assigned to this campaign'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "+ Add More Leads" above to select leads for this campaign.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={
                            filteredAssignedLeads.length > 0 &&
                            selectedToRemove.length === filteredAssignedLeads.length
                          }
                          onChange={toggleSelectAllRemove}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">
                        Lead Name & Contact
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">
                        Company
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredAssignedLeads.map((lead) => {
                      const isSelected = selectedToRemove.includes(lead.id);
                      const isRemoving = removingId === lead.id;

                      return (
                        <tr
                          key={lead.id}
                          className={cn(
                            'hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors',
                            isSelected && 'bg-blue-50/40 dark:bg-blue-950/20'
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRemove(lead.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {lead.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {campaign.channel === 'WHATSAPP'
                                ? lead.phone || 'No phone set'
                                : lead.email}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                            {lead.company || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isRemoving}
                              onClick={() => handleRemoveSingle(lead.id, lead.name)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 h-auto"
                            >
                              {isRemoving ? 'Removing...' : 'Remove'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Add More Leads */}
        {activeTab === 'add' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {selectedToAdd.length > 0 ? (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {selectedToAdd.length} new lead{selectedToAdd.length > 1 ? 's' : ''} selected to
                    add
                  </span>
                ) : (
                  'Select leads below to add to this campaign:'
                )}
              </span>

              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSelected}
                disabled={selectedToAdd.length === 0 || loading}
              >
                {loading ? 'Adding...' : `Add Selected (${selectedToAdd.length})`}
              </Button>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              <LeadPickerTable
                selectedIds={selectedToAdd}
                onChange={(ids) => {
                  // Only allow selecting leads that aren't already in the campaign
                  const validNew = ids.filter((id) => !assignedLeadIds.has(id));
                  setSelectedToAdd(validNew);
                }}
                importHistoryId={campaign.datasetId || undefined}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
