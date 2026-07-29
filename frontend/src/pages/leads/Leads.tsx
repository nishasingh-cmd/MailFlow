import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Lead, LeadStatus, ImportHistory } from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  Table,
  Column,
  BadgeVariant,
} from '../../components/ui';
import { ImportLeadsModal } from '../../components/leads/ImportLeadsModal';
import { LeadDetailsDrawer } from '../../components/leads/LeadDetailsDrawer';
import { LeadFormModal } from '../../components/leads/LeadFormModal';
import { ImportHistoryTable } from '../../components/leads/ImportHistoryTable';
import { useToast } from '../../hooks/useToast';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
  { value: 'BOUNCED', label: 'Bounced' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Date Added (Newest First)' },
  { value: 'createdAt-asc', label: 'Date Added (Oldest First)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'company-asc', label: 'Company (A-Z)' },
];

export default function Leads() {
  const { toast } = useToast();

  // State Management
  const [activeTab, setActiveTab] = useState<'LEADS' | 'HISTORY'>('LEADS');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [sortOption, setSortOption] = useState<string>('createdAt-desc');

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Drawers State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [selectedLeadDetail, setSelectedLeadDetail] = useState<
    (Lead & { importHistory?: ImportHistory | null }) | null
  >(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Import History State
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Stats calculation
  const [stats, setStats] = useState({
    total: 0,
    newCount: 0,
    contactedCount: 0,
    qualifiedCount: 0,
  });

  // Fetch Leads List
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sortBy, sortOrder] = sortOption.split('-') as [
        'name' | 'email' | 'company' | 'createdAt' | 'status',
        'asc' | 'desc',
      ];

      const response = await leadService.getLeads({
        search: searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      setLeads(response.leads);
      setTotalLeads(response.total);
      setTotalPages(response.totalPages);

      // Update basic summary stats if on page 1 with no search filter
      if (page === 1 && !searchQuery && statusFilter === 'ALL') {
        setStats({
          total: response.total,
          newCount: response.leads.filter((l) => l.status === 'NEW').length,
          contactedCount: response.leads.filter((l) => l.status === 'CONTACTED').length,
          qualifiedCount: response.leads.filter((l) => l.status === 'QUALIFIED').length,
        });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to load leads.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, sortOption, page, limit, toast]);

  // Fetch Import History
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const history = await leadService.getImportHistory();
      setImportHistory(history);
    } catch {
      toast.error('Failed to load import history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'LEADS') {
      fetchLeads();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchLeads, fetchHistory]);

  // Selection Checkbox Handlers
  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(leads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;

    if (
      !window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)
    ) {
      return;
    }

    try {
      const res = await leadService.bulkDeleteLeads(selectedLeadIds);
      toast.success(res.message);
      setSelectedLeadIds([]);
      fetchLeads();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to delete selected leads.');
    }
  };

  // Delete Single Lead
  const handleDeleteSingle = async (lead: Lead) => {
    if (!window.confirm(`Delete lead "${lead.name}" (${lead.email})?`)) return;

    try {
      await leadService.deleteLead(lead.id);
      toast.success('Lead deleted.');
      fetchLeads();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to delete lead.');
    }
  };

  // Open Lead Drawer
  const handleOpenDetail = async (lead: Lead) => {
    try {
      const fullLead = await leadService.getLead(lead.id);
      setSelectedLeadDetail(fullLead);
      setIsDetailDrawerOpen(true);
    } catch {
      setSelectedLeadDetail(lead);
      setIsDetailDrawerOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    let variant: BadgeVariant = 'neutral';
    let label = status;

    switch (status) {
      case 'NEW':
        variant = 'info';
        label = 'New';
        break;
      case 'CONTACTED':
        variant = 'warning';
        label = 'Contacted';
        break;
      case 'QUALIFIED':
        variant = 'success';
        label = 'Qualified';
        break;
      case 'UNSUBSCRIBED':
        variant = 'neutral';
        label = 'Unsubscribed';
        break;
      case 'BOUNCED':
        variant = 'error';
        label = 'Bounced';
        break;
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  const leadColumns: Column<Lead>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={leads.length > 0 && selectedLeadIds.length === leads.length}
          onChange={handleSelectAll}
          className="rounded border-zinc-600 text-brand-500 focus:ring-brand-500 bg-zinc-800"
        />
      ),
      render: (lead) => (
        <input
          type="checkbox"
          checked={selectedLeadIds.includes(lead.id)}
          onChange={() => handleToggleSelectLead(lead.id)}
          className="rounded border-zinc-600 text-brand-500 focus:ring-brand-500 bg-zinc-800"
        />
      ),
      width: '40px',
    },
    {
      key: 'name',
      header: 'Name',
      render: (lead) => (
        <button
          onClick={() => handleOpenDetail(lead)}
          className="font-semibold text-[var(--content-primary)] hover:text-brand-400 text-left"
        >
          {lead.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (lead) => (
        <span className="text-xs font-mono text-[var(--content-secondary)]">{lead.email}</span>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (lead) => (
        <span className="text-xs">
          {lead.company || <span className="text-[var(--content-tertiary)] italic">—</span>}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (lead) => (
        <span className="text-xs font-mono">
          {lead.phone || <span className="text-[var(--content-tertiary)] italic">—</span>}
        </span>
      ),
    },
    {
      key: 'website',
      header: 'Website',
      render: (lead) => (
        <span className="text-xs">
          {lead.website ? (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-400 hover:underline truncate max-w-[120px] block"
            >
              {lead.website}
            </a>
          ) : (
            <span className="text-[var(--content-tertiary)] italic">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => getStatusBadge(lead.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(lead)}>
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingLead(lead);
              setIsFormModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => handleDeleteSingle(lead)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Lead Management
          </h1>
          <p className="text-sm text-[var(--content-secondary)]">
            Upload, manage, filter, and organize your cold outreach prospects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            📥 Import CSV / Excel
          </Button>

          <Button
            onClick={() => {
              setEditingLead(null);
              setIsFormModalOpen(true);
            }}
          >
            + Add Lead
          </Button>
        </div>
      </div>

      {/* ── Stats Overview Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="default" className="p-4">
          <span className="text-xs font-medium text-[var(--content-tertiary)] uppercase tracking-wider">
            Total Leads
          </span>
          <p className="text-2xl font-bold text-[var(--content-primary)] mt-1">{stats.total}</p>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
            New Prospect Leads
          </span>
          <p className="text-2xl font-bold text-brand-400 mt-1">{stats.newCount}</p>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            Contacted
          </span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.contactedCount}</p>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
            Qualified
          </span>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.qualifiedCount}</p>
        </Card>
      </div>

      {/* ── Main Workspace Card ── */}
      <Card variant="default" className="p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[var(--surface-border)] space-x-6">
          <button
            onClick={() => setActiveTab('LEADS')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'LEADS'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            }`}
          >
            All Leads ({totalLeads})
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'HISTORY'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            }`}
          >
            Import History
          </button>
        </div>

        {/* ── TAB 1: ALL LEADS ── */}
        {activeTab === 'LEADS' && (
          <div className="space-y-4">
            {/* Toolbar: Search, Filters & Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <Input
                  placeholder="Search by name, email, company, or industry..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val as LeadStatus | 'ALL');
                    setPage(1);
                  }}
                  className="w-40"
                />

                <Select
                  options={SORT_OPTIONS}
                  value={sortOption}
                  onChange={(val) => {
                    setSortOption(val);
                    setPage(1);
                  }}
                  className="w-56"
                />
              </div>
            </div>

            {/* Bulk Actions Header Banner */}
            {selectedLeadIds.length > 0 && (
              <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-between text-sm">
                <span className="text-[var(--content-primary)] font-medium">
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </span>
                <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                  Delete Selected ({selectedLeadIds.length})
                </Button>
              </div>
            )}

            {/* Leads Table */}
            <Table
              columns={leadColumns}
              data={leads}
              loading={isLoading}
              keyExtractor={(item) => item.id}
              emptyText={
                searchQuery || statusFilter !== 'ALL'
                  ? 'No leads match your current search query or filter criteria.'
                  : 'Import leads via CSV/Excel or add a lead manually to get started.'
              }
            />

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)] text-xs text-[var(--content-secondary)]">
                <div>
                  Showing {leads.length} of {totalLeads} leads (Page {page} of {totalPages})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: IMPORT HISTORY ── */}
        {activeTab === 'HISTORY' && (
          <ImportHistoryTable history={importHistory} isLoading={isHistoryLoading} />
        )}
      </Card>

      {/* ── Modals & Drawers ── */}
      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          if (activeTab === 'HISTORY') fetchHistory();
        }}
      />

      <LeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        lead={editingLead}
        onSuccess={fetchLeads}
      />

      <LeadDetailsDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        lead={selectedLeadDetail}
        onEdit={(lead) => {
          setEditingLead(lead);
          setIsFormModalOpen(true);
        }}
        onDelete={(lead) => {
          handleDeleteSingle(lead);
        }}
      />
    </div>
  );
}
