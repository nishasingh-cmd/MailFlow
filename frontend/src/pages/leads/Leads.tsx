import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Lead, LeadStatus, ImportHistory, ResearchProgressResponse } from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import { researchService } from '../../services/research.service';
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
import { CompanyResearchDrawer } from '../../components/research/CompanyResearchDrawer';
import { ResearchStatusBadge } from '../../components/research/ResearchStatusBadge';
import { BulkResearchBar } from '../../components/research/BulkResearchBar';
import { ResearchProgressCard } from '../../components/research/ResearchProgressCard';
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

// Lead with research status attached
interface LeadWithStatus extends Lead {
  researchStatus?: string | null;
}

export default function Leads() {
  const { toast } = useToast();

  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'LEADS' | 'HISTORY' | 'RESEARCH'>('LEADS');

  // ── Leads State ───────────────────────────────────────────────────────────
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

  // ── Modals & Drawers State ─────────────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [selectedLeadDetail, setSelectedLeadDetail] = useState<
    (Lead & { importHistory?: ImportHistory | null }) | null
  >(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // ── Import History State ───────────────────────────────────────────────────
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total: 0,
    newCount: 0,
    contactedCount: 0,
    qualifiedCount: 0,
  });

  // ── Research State ─────────────────────────────────────────────────────────
  const [researchLeads, setResearchLeads] = useState<LeadWithStatus[]>([]);
  const [researchLeadsLoading, setResearchLeadsLoading] = useState(false);
  const [researchStatuses, setResearchStatuses] = useState<Record<string, string | null>>({});
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressResponse | null>(null);

  // Research drawer
  const [researchDrawerOpen, setResearchDrawerOpen] = useState(false);
  const [researchDrawerLeadId, setResearchDrawerLeadId] = useState<string | null>(null);
  const [researchDrawerCompanyName, setResearchDrawerCompanyName] = useState<string | null>(null);

  // ── Fetch Leads ────────────────────────────────────────────────────────────
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

  // ── Fetch Import History ───────────────────────────────────────────────────
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

  // ── Fetch Research Tab Leads ───────────────────────────────────────────────
  const fetchResearchLeads = useCallback(async () => {
    setResearchLeadsLoading(true);
    try {
      const response = await leadService.getLeads({
        sortBy: 'company',
        sortOrder: 'asc',
        limit: 100,
        page: 1,
      });
      // Only leads with a company name are researchable
      const withCompany = response.leads.filter((l) => l.company);
      setResearchLeads(withCompany);

      // Fetch bulk research status
      if (withCompany.length > 0) {
        const statusList = await researchService.getBulkStatus(withCompany.map((l) => l.id));
        const statusMap: Record<string, string | null> = {};
        statusList.forEach((s) => {
          statusMap[s.leadId] = s.researchStatus;
        });
        setResearchStatuses(statusMap);
      }
    } catch {
      toast.error('Failed to load research leads.');
    } finally {
      setResearchLeadsLoading(false);
    }
  }, [toast]);

  // ── Tab effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'LEADS') {
      fetchLeads();
    } else if (activeTab === 'HISTORY') {
      fetchHistory();
    } else if (activeTab === 'RESEARCH') {
      fetchResearchLeads();
    }
  }, [activeTab, fetchLeads, fetchHistory, fetchResearchLeads]);

  // ── Selection Handlers ─────────────────────────────────────────────────────
  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(leads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleResearchSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(researchLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Bulk Delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (
      !window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)
    )
      return;
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

  // ── Single Lead Delete ─────────────────────────────────────────────────────
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

  // ── Open Lead Detail Drawer ────────────────────────────────────────────────
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

  // ── Open Research Drawer ───────────────────────────────────────────────────
  const handleOpenResearch = (lead: Lead) => {
    setResearchDrawerLeadId(lead.id);
    setResearchDrawerCompanyName(lead.company ?? null);
    setResearchDrawerOpen(true);
  };

  // ── Bulk Research ──────────────────────────────────────────────────────────
  const handleBulkResearch = async () => {
    if (selectedLeadIds.length === 0) return;
    setIsResearching(true);
    setResearchProgress(null);
    try {
      const progress = await researchService.researchBulk(selectedLeadIds);
      setResearchProgress(progress);
      toast.success(
        `Research complete: ${progress.completed} succeeded, ${progress.failed} failed`
      );
      setSelectedLeadIds([]);
      fetchResearchLeads();
    } catch {
      toast.error('Bulk research failed. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearchAll = async () => {
    setIsResearching(true);
    setResearchProgress(null);
    try {
      const progress = await researchService.researchAll();
      setResearchProgress(progress);
      toast.success(
        `Research complete: ${progress.completed} succeeded, ${progress.failed} failed`
      );
      fetchResearchLeads();
    } catch {
      toast.error('Research all failed. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  // ── Status Badge Helpers ───────────────────────────────────────────────────
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

  // ── Table Columns: Main Leads ──────────────────────────────────────────────
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

  // ── Table Columns: Research Tab ────────────────────────────────────────────
  const researchColumns: Column<Lead>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={researchLeads.length > 0 && selectedLeadIds.length === researchLeads.length}
          onChange={handleResearchSelectAll}
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
      header: 'Lead',
      render: (lead) => (
        <div>
          <p className="font-semibold text-[var(--content-primary)] text-sm">{lead.name}</p>
          <p className="text-xs text-[var(--content-tertiary)] font-mono">{lead.email}</p>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (lead) => (
        <span className="text-sm font-medium text-[var(--content-primary)]">
          {lead.company || (
            <span className="text-[var(--content-tertiary)] italic">No company</span>
          )}
        </span>
      ),
    },
    {
      key: 'research_status',
      header: 'Research Status',
      render: (lead) => (
        <ResearchStatusBadge
          status={
            (researchStatuses[lead.id] as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED') ?? null
          }
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleOpenResearch(lead)}>
            {researchStatuses[lead.id] === 'COMPLETED' ? '📊 View Research' : '🔍 Research'}
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Lead Management
          </h1>
          <p className="text-sm text-[var(--content-secondary)]">
            Upload, manage, filter, and research your cold outreach prospects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'RESEARCH' && (
            <Button variant="outline" onClick={handleResearchAll} disabled={isResearching}>
              {isResearching ? '⏳ Researching...' : '🔍 Research All Companies'}
            </Button>
          )}
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
          {(
            [
              { id: 'LEADS', label: `All Leads (${totalLeads})` },
              { id: 'HISTORY', label: 'Import History' },
              { id: 'RESEARCH', label: '🔍 AI Research' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedLeadIds([]);
              }}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: ALL LEADS ── */}
        {activeTab === 'LEADS' && (
          <div className="space-y-4">
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

            {/* Bulk Actions Banner */}
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

        {/* ── TAB 3: AI RESEARCH ── */}
        {activeTab === 'RESEARCH' && (
          <div className="space-y-4">
            {/* Description */}
            <div className="flex items-start gap-3 p-3 bg-brand-500/5 border border-brand-500/20 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-brand-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--content-primary)]">
                  AI Company Research
                </p>
                <p className="text-xs text-[var(--content-secondary)] mt-0.5">
                  Automatically research company intelligence, pain points, and outreach
                  opportunities using AI. Only leads with a company name can be researched.
                </p>
              </div>
            </div>

            {/* Bulk Research Action Bar */}
            <BulkResearchBar
              selectedCount={selectedLeadIds.length}
              onResearchSelected={handleBulkResearch}
              onClear={() => setSelectedLeadIds([])}
              isResearching={isResearching}
            />

            {/* Progress Card */}
            <ResearchProgressCard progress={researchProgress} isRunning={isResearching} />

            {/* Research Table */}
            <Table
              columns={researchColumns}
              data={researchLeads}
              loading={researchLeadsLoading}
              keyExtractor={(item) => item.id}
              emptyText="No leads with company names found. Import leads with company information to enable research."
            />
          </div>
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

      <CompanyResearchDrawer
        isOpen={researchDrawerOpen}
        onClose={() => setResearchDrawerOpen(false)}
        leadId={researchDrawerLeadId}
        companyName={researchDrawerCompanyName}
        onResearchComplete={fetchResearchLeads}
      />
    </div>
  );
}
