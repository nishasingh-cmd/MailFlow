import { useState, useEffect, useCallback } from 'react';
import { Campaign, CampaignStatus, CampaignStats, CampaignQueryFilters } from '@mailflow/shared';
import { campaignService } from '../../services/campaign.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, EmptyState } from '../../components/ui';
import { CampaignStatsCards } from '../../components/campaigns/CampaignStatsCards';
import { CampaignTable } from '../../components/campaigns/CampaignTable';
import { CreateCampaignModal } from '../../components/campaigns/CreateCampaignModal';
import { EditCampaignModal } from '../../components/campaigns/EditCampaignModal';
import { DeleteCampaignModal } from '../../components/campaigns/DeleteCampaignModal';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'leadCount-desc', label: 'Most Leads' },
  { value: 'leadCount-asc', label: 'Fewest Leads' },
];

export default function Campaigns() {
  const { toast } = useToast();

  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState('createdAt-desc');

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const [sortBy, sortOrder] = sort.split('-') as [
          CampaignQueryFilters['sortBy'],
          CampaignQueryFilters['sortOrder'],
        ];

        const result = await campaignService.getCampaigns({
          search: search || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          sortBy,
          sortOrder,
          page: pageNum,
          limit: 10,
        });

        setCampaigns(result.campaigns);
        setStats(result.stats);
        setTotal(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch {
        toast.error('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, sort, toast]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchCampaigns(1);
    }, 300);
    return () => clearTimeout(t);
  }, [fetchCampaigns]);

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      await campaignService.duplicateCampaign(campaign.id);
      toast.success(`"${campaign.name}" duplicated successfully`);
      fetchCampaigns(page);
    } catch {
      toast.error('Failed to duplicate campaign');
    }
  };

  const showEmpty = !loading && campaigns.length === 0 && !search && statusFilter === 'ALL';
  const showNoResults = !loading && campaigns.length === 0 && (search || statusFilter !== 'ALL');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-[var(--content-secondary)] mt-0.5">
            Create, organize, and manage your email campaigns.
          </p>
        </div>
        <Button
          id="create-campaign-btn"
          variant="primary"
          onClick={() => setCreateOpen(true)}
          leftIcon={
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          <span className="hidden sm:inline">Create Campaign</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <CampaignStatsCards stats={stats} loading={loading && !stats} />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          id="campaign-search"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
        <div className="flex gap-2">
          <Select
            id="campaign-status-filter"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as CampaignStatus | 'ALL')}
            options={STATUS_FILTER_OPTIONS}
            className="w-36"
          />
          <Select
            id="campaign-sort"
            value={sort}
            onChange={(val) => setSort(val)}
            options={SORT_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      {/* Results count */}
      {!loading && !showEmpty && (
        <div className="flex items-center justify-between text-sm text-[var(--content-secondary)]">
          <span>{total === 0 ? 'No results' : `${total} campaign${total !== 1 ? 's' : ''}`}</span>
          {total > 10 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Campaign Table */}
      {(loading || campaigns.length > 0) && (
        <CampaignTable
          campaigns={campaigns}
          loading={loading}
          onEdit={(c) => setEditCampaign(c)}
          onDelete={(c) => setDeleteCampaign(c)}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCampaigns(page - 1)}
            disabled={page <= 1}
          >
            ← Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchCampaigns(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-brand-500 text-white'
                      : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCampaigns(page + 1)}
            disabled={page >= totalPages}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Empty state — no campaigns at all */}
      {showEmpty && (
        <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-card)] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              No campaigns created yet
            </h3>
            <p className="text-sm text-[var(--content-secondary)] mt-1">
              Group your leads into campaigns and attach email templates before sending.
            </p>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create Your First Campaign
          </Button>
        </div>
      )}

      {/* No results for active search/filter */}
      {showNoResults && (
        <EmptyState
          title="No matching campaigns"
          description="Try adjusting your search or filter to find what you're looking for."
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setSearch('');
              setStatusFilter('ALL');
            },
          }}
        />
      )}

      {/* Modals */}
      <CreateCampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetchCampaigns(1);
        }}
      />

      <EditCampaignModal
        open={!!editCampaign}
        campaign={editCampaign}
        onClose={() => setEditCampaign(null)}
        onUpdated={() => {
          toast.success('Campaign updated successfully');
          setEditCampaign(null);
          fetchCampaigns(page);
        }}
      />

      <DeleteCampaignModal
        open={!!deleteCampaign}
        campaign={deleteCampaign}
        onClose={() => setDeleteCampaign(null)}
        onDeleted={() => {
          toast.success('Campaign deleted');
          setDeleteCampaign(null);
          fetchCampaigns(1);
        }}
      />
    </div>
  );
}
