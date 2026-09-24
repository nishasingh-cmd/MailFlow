import { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ConfirmModal,
} from '../../components/ui';
import { ImportLeadsModal } from '../../components/leads/ImportLeadsModal';
import { LeadDetailsDrawer } from '../../components/leads/LeadDetailsDrawer';
import { LeadFormModal } from '../../components/leads/LeadFormModal';
import { ImportHistoryTable } from '../../components/leads/ImportHistoryTable';
import { CompanyResearchDrawer } from '../../components/research/CompanyResearchDrawer';
import { EmailGeneratorDrawer } from '../../components/email-generation/EmailGeneratorDrawer';
import { CreateCampaignModal } from '../../components/campaigns/CreateCampaignModal';
import { ResearchStatusBadge } from '../../components/research/ResearchStatusBadge';
import { BulkResearchBar } from '../../components/research/BulkResearchBar';
import { ResearchProgressCard } from '../../components/research/ResearchProgressCard';
import { WhatsappPreviewModal } from '../../components/whatsapp/WhatsappPreviewModal';
import { WhatsappSendOptionsModal } from '../../components/whatsapp/WhatsappSendOptionsModal';
import { useToast } from '../../hooks/useToast';
import { useClickOutside } from '../../hooks/useClickOutside';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'NEW', label: 'Not Contacted' },
  { value: 'CONTACTED', label: 'Contacted' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Date Added (Newest First)' },
  { value: 'createdAt-asc', label: 'Date Added (Oldest First)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'company-asc', label: 'Company (A-Z)' },
];

const STANDARD_COLUMN_KEYS = ['name', 'email', 'company', 'phone', 'website', 'status'];

const getColumnStorageKey = (datasetId: string) => `mailflow:lead-column-selection:${datasetId}`;
const getAvailableColumnsStorageKey = (datasetId: string) =>
  `mailflow:lead-available-columns:${datasetId}`;

const getSavedColumns = (datasetId: string): string[] | null => {
  if (!datasetId) return null;
  try {
    const raw = localStorage.getItem(getColumnStorageKey(datasetId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch (e) {
    console.error('Failed to parse saved column selection:', e);
  }
  return null;
};

const getCachedAvailableColumns = (datasetId: string): string[] | null => {
  if (!datasetId) return null;
  try {
    const raw = localStorage.getItem(getAvailableColumnsStorageKey(datasetId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
};

interface LeadWithStatus extends Lead {
  researchStatus?: string | null;
}

export default function Leads() {
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab')?.toUpperCase();
  const activeTab: 'LEADS' | 'HISTORY' | 'RESEARCH' =
    rawTab === 'HISTORY' || rawTab === 'RESEARCH' ? rawTab : 'LEADS';

  const setActiveTab = useCallback(
    (tab: 'LEADS' | 'HISTORY' | 'RESEARCH') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'LEADS') {
            next.delete('tab');
          } else {
            next.set('tab', tab.toLowerCase());
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    try {
      localStorage.removeItem('mailflow:leads-active-tab');
    } catch {
      // Ignore
    }
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    try {
      return localStorage.getItem('mailflow:selected-dataset-id') || '';
    } catch {
      return '';
    }
  });
  const [sortOption, setSortOption] = useState<string>('createdAt-desc');

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User-selected visible columns for current dataset (persisted independently from available columns)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    try {
      const initialDatasetId = localStorage.getItem('mailflow:selected-dataset-id') || '';
      if (initialDatasetId) {
        const saved = getSavedColumns(initialDatasetId);
        if (saved !== null) {
          return saved;
        }
      }
    } catch {
      // Ignore storage errors on initial state
    }
    return [];
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(columnDropdownRef, () => setIsColumnDropdownOpen(false), isColumnDropdownOpen);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Deletion Modal States (replacing native window.confirm)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [selectedLeadDetail, setSelectedLeadDetail] = useState<
    (Lead & { importHistory?: ImportHistory | null }) | null
  >(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [manualLeadsCount, setManualLeadsCount] = useState<number>(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    notContactedCount: 0,
    contactedCount: 0,
  });

  const [researchLeads, setResearchLeads] = useState<LeadWithStatus[]>([]);
  const [researchLeadsLoading, setResearchLeadsLoading] = useState(false);
  const [researchStatuses, setResearchStatuses] = useState<Record<string, string | null>>({});
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressResponse | null>(null);

  const [researchDrawerOpen, setResearchDrawerOpen] = useState(false);
  const [researchDrawerLeadId, setResearchDrawerLeadId] = useState<string | null>(null);
  const [researchDrawerCompanyName, setResearchDrawerCompanyName] = useState<string | null>(null);

  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [emailDrawerLeadId, setEmailDrawerLeadId] = useState<string | null>(null);
  const [emailDrawerLeadName, setEmailDrawerLeadName] = useState<string | null>(null);
  const [emailDrawerCompanyName, setEmailDrawerCompanyName] = useState<string | null>(null);

  const openEmailGenerator = useCallback(
    (leadId: string, leadName?: string | null, companyName?: string | null) => {
      setEmailDrawerLeadId(leadId);
      setEmailDrawerLeadName(leadName || null);
      setEmailDrawerCompanyName(companyName || null);
      setEmailDrawerOpen(true);
    },
    []
  );

  const [waPreviewOpen, setWaPreviewOpen] = useState(false);
  const [waPreviewLead, setWaPreviewLead] = useState<Lead | null>(null);
  const [waLeadId, setWaLeadId] = useState<string | null>(null);
  const [waLeadName, setWaLeadName] = useState<string>('');
  const [waCompanyName, setWaCompanyName] = useState<string>('');
  const [waPhone, setWaPhone] = useState<string>('');
  const [waLastInboundMessageAt, setWaLastInboundMessageAt] = useState<string | null>(null);
  const [waBatchModalOpen, setWaBatchModalOpen] = useState(false);

  const openWhatsappModal = useCallback((lead: Lead) => {
    setWaPreviewLead(lead);
    setWaLeadId(lead.id);
    setWaLeadName(lead.name);
    setWaCompanyName(lead.company || '');
    setWaPhone(lead.phone || '');
    setWaLastInboundMessageAt(lead.lastInboundMessageAt ?? null);
    setWaPreviewOpen(true);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!selectedDatasetId) return;
    setIsLoading(true);
    try {
      const [sortBy, sortOrder] = sortOption.split('-') as [
        'name' | 'email' | 'company' | 'createdAt' | 'status',
        'asc' | 'desc',
      ];

      const response = await leadService.getLeads({
        search: searchQuery,
        status: statusFilter,
        importHistoryId: selectedDatasetId,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      setLeads(response.leads);
      setTotalLeads(response.total);
      setTotalPages(response.totalPages);

      if (response.stats) {
        setStats(response.stats);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to load leads.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, selectedDatasetId, sortOption, page, limit, toast]);

  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const [history, manualRes] = await Promise.all([
        leadService.getImportHistory(),
        leadService.getLeads({ importHistoryId: 'MANUAL', limit: 1 }),
      ]);
      const validHistory = history.filter((h) => h.importedCount > 0);
      setImportHistory(validHistory);
      setManualLeadsCount(manualRes.total);

      setSelectedDatasetId((prev) => {
        if (prev) {
          if (prev === 'MANUAL' && manualRes.total > 0) return prev;
          if (validHistory.some((h) => h.id === prev)) return prev;
        }
        const savedId = localStorage.getItem('mailflow:selected-dataset-id');
        if (savedId) {
          if (savedId === 'MANUAL' && manualRes.total > 0) return savedId;
          if (validHistory.some((h) => h.id === savedId)) return savedId;
        }
        const fallback = validHistory.length > 0 ? validHistory[0].id : 'MANUAL';
        try {
          localStorage.setItem('mailflow:selected-dataset-id', fallback);
        } catch {
          // Ignore storage write error
        }
        return fallback;
      });
    } catch {
      toast.error('Failed to load import history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [toast]);

  const fetchResearchLeads = useCallback(async () => {
    if (!selectedDatasetId) return;
    setResearchLeadsLoading(true);
    try {
      const response = await leadService.getLeads({
        importHistoryId: selectedDatasetId,
        limit: 100,
        page: 1,
      });

      setResearchLeads(response.leads);

      if (response.leads.length > 0) {
        const statusList = await researchService.getBulkStatus(response.leads.map((l) => l.id));
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
  }, [selectedDatasetId, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (activeTab === 'LEADS') {
      fetchLeads();
    } else if (activeTab === 'HISTORY') {
      fetchHistory();
    } else if (activeTab === 'RESEARCH') {
      fetchResearchLeads();
    }
  }, [activeTab, fetchLeads, fetchHistory, fetchResearchLeads]);

  const handleSelectAll = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedLeadIds(leads.map((l) => l.id));
      } else {
        setSelectedLeadIds([]);
      }
    },
    [leads]
  );

  const handleResearchSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(researchLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleSelectLead = useCallback((id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    setBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const res = await leadService.bulkDeleteLeads(selectedLeadIds);
      toast.success(res.message);
      setSelectedLeadIds([]);
      setBulkDeleteModalOpen(false);
      fetchLeads();
      fetchHistory();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to delete selected leads.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteSingle = useCallback((lead: Lead) => {
    setLeadToDelete(lead);
  }, []);

  const confirmDeleteSingle = async () => {
    if (!leadToDelete) return;
    setIsDeletingLead(true);
    try {
      await leadService.deleteLead(leadToDelete.id);
      toast.success('Lead deleted.');
      setLeadToDelete(null);
      fetchLeads();
      fetchHistory();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to delete lead.');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const handleOpenDetail = useCallback(async (lead: Lead) => {
    try {
      const fullLead = await leadService.getLead(lead.id);
      setSelectedLeadDetail(fullLead);
      setIsDetailDrawerOpen(true);
    } catch {
      setSelectedLeadDetail(lead);
      setIsDetailDrawerOpen(true);
    }
  }, []);

  const handleOpenResearch = (lead: Lead) => {
    setResearchDrawerLeadId(lead.id);
    setResearchDrawerCompanyName(lead.company ?? null);
    setResearchDrawerOpen(true);
  };

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

  const getStatusBadge = (status: string) => {
    if (status === 'CONTACTED' || status === 'QUALIFIED') {
      return <Badge variant="success">Contacted</Badge>;
    }
    return <Badge variant="neutral">Not Contacted</Badge>;
  };

  // Check if current dataset has mirrored spreadsheet columns
  const uploadedColumns = useMemo<string[] | null>(() => {
    // If viewing manual leads, always show standard CRM columns
    if (selectedDatasetId === 'MANUAL') return null;

    // For any uploaded sheet, mirror its uploaded columns
    for (const lead of leads) {
      if (
        lead.customFields &&
        typeof lead.customFields === 'object' &&
        Array.isArray((lead.customFields as Record<string, unknown>)._uploadedColumns) &&
        ((lead.customFields as Record<string, unknown>)._uploadedColumns as string[]).length > 0
      ) {
        const cols = (lead.customFields as Record<string, unknown>)._uploadedColumns as string[];
        if (selectedDatasetId) {
          try {
            localStorage.setItem(
              getAvailableColumnsStorageKey(selectedDatasetId),
              JSON.stringify(cols)
            );
          } catch {
            // Ignore storage write error
          }
        }
        return cols;
      }
    }

    if (selectedDatasetId) {
      const cached = getCachedAvailableColumns(selectedDatasetId);
      if (cached && cached.length > 0) return cached;
    }

    return null;
  }, [leads, selectedDatasetId]);

  const selectedHistory = useMemo(() => {
    if (!selectedDatasetId || selectedDatasetId === 'MANUAL') return null;
    return importHistory.find((h) => h.id === selectedDatasetId) || null;
  }, [importHistory, selectedDatasetId]);

  // Discover all unique dynamic field keys across leads on the current page
  const dynamicFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    leads.forEach((l) => {
      if (l.customFields && typeof l.customFields === 'object') {
        Object.keys(l.customFields).forEach((k) => {
          if (k === '_uploadedColumns') return;
          const val = l.customFields?.[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            keys.add(k);
          }
        });
      }
    });
    return Array.from(keys);
  }, [leads]);

  // Synchronize persisted column selection with available columns
  useEffect(() => {
    if (!selectedDatasetId) return;

    const saved = getSavedColumns(selectedDatasetId);

    if (uploadedColumns && uploadedColumns.length > 0) {
      if (saved !== null) {
        // Case 2: Persisted selection exists.
        // Prune removed columns. New columns remain unselected by default.
        const sanitized = saved.filter((col) => uploadedColumns.includes(col));
        setSelectedColumns(sanitized);

        if (sanitized.length !== saved.length) {
          try {
            localStorage.setItem(getColumnStorageKey(selectedDatasetId), JSON.stringify(sanitized));
          } catch {
            // Ignore storage write error
          }
        }
      } else {
        // Case 1: No previous selection exists (new upload).
        // Default to all available uploaded columns.
        setSelectedColumns(uploadedColumns);
      }
    } else if (selectedDatasetId === 'MANUAL' || (!uploadedColumns && leads.length > 0)) {
      const availableStandard = [
        ...STANDARD_COLUMN_KEYS,
        ...dynamicFieldKeys.map((k) => `custom_${k}`),
      ];

      if (saved !== null) {
        const sanitized = saved.filter((col) => availableStandard.includes(col));
        setSelectedColumns(sanitized);
        if (sanitized.length !== saved.length) {
          try {
            localStorage.setItem(getColumnStorageKey(selectedDatasetId), JSON.stringify(sanitized));
          } catch {
            // Ignore storage write error
          }
        }
      } else {
        setSelectedColumns(availableStandard);
      }
    }
  }, [selectedDatasetId, uploadedColumns, dynamicFieldKeys, leads.length]);

  const toggleColumn = (colName: string) => {
    if (!selectedDatasetId) return;
    setSelectedColumns((prev) => {
      const next = prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName];
      try {
        localStorage.setItem(getColumnStorageKey(selectedDatasetId), JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save column selection:', err);
      }
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    if (!selectedDatasetId) return;
    const allCols =
      uploadedColumns && uploadedColumns.length > 0
        ? [...uploadedColumns]
        : [...STANDARD_COLUMN_KEYS, ...dynamicFieldKeys.map((k) => `custom_${k}`)];

    setSelectedColumns(allCols);
    try {
      localStorage.setItem(getColumnStorageKey(selectedDatasetId), JSON.stringify(allCols));
    } catch (err) {
      console.error('Failed to save column selection:', err);
    }
  };

  const handleClearAllColumns = () => {
    if (!selectedDatasetId) return;
    setSelectedColumns([]);
    try {
      localStorage.setItem(getColumnStorageKey(selectedDatasetId), JSON.stringify([]));
    } catch (err) {
      console.error('Failed to save column selection:', err);
    }
  };

  const handleDatasetChange = (newDatasetId: string) => {
    setSelectedDatasetId(newDatasetId);
    try {
      localStorage.setItem('mailflow:selected-dataset-id', newDatasetId);
      const saved = getSavedColumns(newDatasetId);
      if (saved !== null) {
        setSelectedColumns(saved);
      } else {
        const cachedAvailable = getCachedAvailableColumns(newDatasetId);
        if (cachedAvailable && cachedAvailable.length > 0) {
          setSelectedColumns(cachedAvailable);
        } else {
          setSelectedColumns([]);
        }
      }
    } catch {
      // Ignore storage errors on dataset change
    }
    setPage(1);
  };

  // Generate dynamic columns for custom fields
  const dynamicColumns = useMemo<Column<Lead>[]>(() => {
    return dynamicFieldKeys
      .filter((key) => selectedColumns.includes(`custom_${key}`))
      .map((key) => ({
        key: `custom_${key}`,
        header: (
          <span title={key} className="truncate max-w-[140px] inline-block font-medium">
            {key}
          </span>
        ),
        width: '160px',
        render: (lead: Lead) => {
          const val = lead.customFields?.[key];
          if (val === undefined || val === null || String(val).trim() === '') {
            return <span className="text-[var(--content-tertiary)] italic">—</span>;
          }
          const strVal = String(val);
          return (
            <span
              className="text-xs text-[var(--content-secondary)] truncate max-w-[160px] inline-block align-middle"
              title={strVal}
            >
              {strVal}
            </span>
          );
        },
      }));
  }, [dynamicFieldKeys, selectedColumns]);

  const leadColumns = useMemo<Column<Lead>[]>(() => {
    const baseCols: Column<Lead>[] = [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            checked={leads.length > 0 && selectedLeadIds.length === leads.length}
            onChange={handleSelectAll}
            className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 bg-[var(--surface-card)] cursor-pointer"
          />
        ),
        render: (lead) => (
          <input
            type="checkbox"
            checked={selectedLeadIds.includes(lead.id)}
            onChange={() => handleToggleSelectLead(lead.id)}
            className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 bg-[var(--surface-card)] cursor-pointer"
          />
        ),
        width: '40px',
      },
    ];

    if (uploadedColumns && uploadedColumns.length > 0) {
      // 1:1 Mirroring of uploaded spreadsheet columns
      uploadedColumns.forEach((colName, idx) => {
        if (!selectedColumns.includes(colName)) return;

        baseCols.push({
          key: `col_${colName}`,
          header: (
            <span
              title={colName}
              className="truncate max-w-[180px] inline-block font-semibold text-xs tracking-wide"
            >
              {colName}
            </span>
          ),
          render: (lead: Lead) => {
            const val = (lead.customFields as Record<string, unknown> | undefined)?.[colName];
            const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
            const displayVal = hasVal ? String(val) : '—';

            if (idx === 0) {
              return (
                <button
                  type="button"
                  onClick={() => handleOpenDetail(lead)}
                  className="font-semibold text-[var(--content-primary)] hover:text-brand-400 text-left whitespace-nowrap truncate max-w-[220px] block"
                  title={displayVal}
                >
                  {displayVal}
                </button>
              );
            }

            if (
              typeof val === 'string' &&
              (val.startsWith('http://') || val.startsWith('https://'))
            ) {
              return (
                <a
                  href={val}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline truncate max-w-[160px] inline-block text-xs"
                  title={val}
                >
                  {val}
                </a>
              );
            }

            return (
              <span
                className={`text-xs truncate max-w-[180px] inline-block align-middle ${
                  !hasVal
                    ? 'text-[var(--content-tertiary)] italic'
                    : 'text-[var(--content-secondary)]'
                }`}
                title={displayVal}
              >
                {displayVal}
              </span>
            );
          },
        });
      });
    } else {
      // Standard CRM Columns (Fallback for manual / unmapped legacy leads)
      if (selectedColumns.includes('name')) {
        baseCols.push({
          key: 'name',
          header: 'Name',
          render: (lead) => (
            <button
              onClick={() => handleOpenDetail(lead)}
              className="font-semibold text-[var(--content-primary)] hover:text-brand-400 text-left whitespace-nowrap"
            >
              {lead.name}
            </button>
          ),
        });
      }

      if (selectedColumns.includes('email')) {
        baseCols.push({
          key: 'email',
          header: 'Email',
          render: (lead) => {
            if (lead.email.includes('@internal.mailflow')) {
              return <span className="text-xs text-[var(--content-tertiary)] italic">—</span>;
            }
            return (
              <span className="text-xs font-mono text-[var(--content-secondary)] whitespace-nowrap">
                {lead.email}
              </span>
            );
          },
        });
      }

      if (selectedColumns.includes('company')) {
        baseCols.push({
          key: 'company',
          header: 'Company',
          width: '160px',
          render: (lead) => (
            <span className="text-xs whitespace-nowrap">
              {lead.company || <span className="text-[var(--content-tertiary)] italic">—</span>}
            </span>
          ),
        });
      }

      if (selectedColumns.includes('phone')) {
        baseCols.push({
          key: 'phone',
          header: 'Phone',
          render: (lead) => (
            <span className="text-xs font-mono whitespace-nowrap">
              {lead.phone || <span className="text-[var(--content-tertiary)] italic">—</span>}
            </span>
          ),
        });
      }

      if (selectedColumns.includes('website')) {
        baseCols.push({
          key: 'website',
          header: 'Website',
          render: (lead) => (
            <span className="text-xs whitespace-nowrap">
              {lead.website ? (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline truncate max-w-[120px] inline-block"
                >
                  {lead.website}
                </a>
              ) : (
                <span className="text-[var(--content-tertiary)] italic">—</span>
              )}
            </span>
          ),
        });
      }

      // Dynamic industry columns injected here
      baseCols.push(...dynamicColumns);

      if (selectedColumns.includes('status')) {
        baseCols.push({
          key: 'status',
          header: 'Status',
          width: '140px',
          render: (lead) => getStatusBadge(lead.status),
        });
      }
    }

    baseCols.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '220px',
      render: (lead) => (
        <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap ml-auto">
          <div className="flex items-center gap-3 mr-1">
            <button
              type="button"
              onClick={() => openWhatsappModal(lead)}
              className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors focus:outline-none cursor-pointer"
              title={`Send WhatsApp message to ${lead.phone || lead.name}`}
              aria-label={`Send WhatsApp to ${lead.name}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  fill="#25D366"
                  d="M12.004 2C6.48 2 2 6.48 2 12c0 1.947.56 3.763 1.528 5.305L2 22l4.832-1.498A9.953 9.953 0 0 0 12.004 22c5.524 0 10.004-4.48 10.004-10s-4.48-10-10.004-10z"
                />
                <path
                  fill="#FFFFFF"
                  d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.476-.15-.676.15-.2.3-.776.98-.952 1.18-.175.2-.351.225-.652.075-.3-.15-1.267-.467-2.414-1.49-.892-.796-1.494-1.778-1.669-2.079-.175-.3-.019-.462.131-.611.136-.134.301-.35.452-.525.15-.175.2-.3.301-.5.101-.2.051-.375-.025-.525-.075-.15-.676-1.63-.927-2.235-.244-.589-.493-.509-.676-.519-.175-.008-.376-.01-.576-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.03-1.053 2.512 0 1.482 1.078 2.912 1.228 3.112.15.2 2.122 3.24 5.141 4.544.718.31 1.278.495 1.716.635.722.23 1.378.198 1.898.12.579-.087 1.78-.727 2.031-1.428.251-.7.251-1.301.176-1.428-.075-.125-.276-.2-.577-.35z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openEmailGenerator(lead.id, lead.name, lead.company)}
              className="p-1.5 rounded-lg text-[#5271ff] hover:bg-[#5271ff]/10 transition-colors focus:outline-none cursor-pointer"
              title={`Generate & Send Email to ${lead.email || lead.name}`}
              aria-label={`Generate and send email to ${lead.name}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
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
    });

    return baseCols;
  }, [
    leads,
    selectedLeadIds,
    selectedColumns,
    dynamicColumns,
    uploadedColumns,
    handleSelectAll,
    handleToggleSelectLead,
    handleOpenDetail,
    handleDeleteSingle,
    openWhatsappModal,
    openEmailGenerator,
  ]);

  const researchColumns: Column<Lead>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={researchLeads.length > 0 && selectedLeadIds.length === researchLeads.length}
          onChange={handleResearchSelectAll}
          className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 bg-[var(--surface-card)] cursor-pointer"
        />
      ),
      render: (lead) => (
        <input
          type="checkbox"
          checked={selectedLeadIds.includes(lead.id)}
          onChange={() => handleToggleSelectLead(lead.id)}
          className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 bg-[var(--surface-card)] cursor-pointer"
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
      width: '180px',
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
      width: '180px',
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
      width: '240px',
      render: (lead) => (
        <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap ml-auto">
          <div className="flex items-center gap-3 mr-1">
            <button
              type="button"
              onClick={() => openWhatsappModal(lead)}
              className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors focus:outline-none cursor-pointer"
              title={`Send WhatsApp message to ${lead.phone || lead.name}`}
              aria-label={`Send WhatsApp to ${lead.name}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  fill="#25D366"
                  d="M12.004 2C6.48 2 2 6.48 2 12c0 1.947.56 3.763 1.528 5.305L2 22l4.832-1.498A9.953 9.953 0 0 0 12.004 22c5.524 0 10.004-4.48 10.004-10s-4.48-10-10.004-10z"
                />
                <path
                  fill="#FFFFFF"
                  d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.476-.15-.676.15-.2.3-.776.98-.952 1.18-.175.2-.351.225-.652.075-.3-.15-1.267-.467-2.414-1.49-.892-.796-1.494-1.778-1.669-2.079-.175-.3-.019-.462.131-.611.136-.134.301-.35.452-.525.15-.175.2-.3.301-.5.101-.2.051-.375-.025-.525-.075-.15-.676-1.63-.927-2.235-.244-.589-.493-.509-.676-.519-.175-.008-.376-.01-.576-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.03-1.053 2.512 0 1.482 1.078 2.912 1.228 3.112.15.2 2.122 3.24 5.141 4.544.718.31 1.278.495 1.716.635.722.23 1.378.198 1.898.12.579-.087 1.78-.727 2.031-1.428.251-.7.251-1.301.176-1.428-.075-.125-.276-.2-.577-.35z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openEmailGenerator(lead.id, lead.name, lead.company)}
              className="p-1.5 rounded-lg text-[#5271ff] hover:bg-[#5271ff]/10 transition-colors focus:outline-none cursor-pointer"
              title={`Generate & Send Email to ${lead.email || lead.name}`}
              aria-label={`Generate and send email to ${lead.name}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-[120px] justify-center"
            onClick={() => handleOpenResearch(lead)}
          >
            {researchStatuses[lead.id] === 'COMPLETED' ? 'View Research' : 'Research'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
              {isResearching ? 'Researching...' : 'Research All Companies'}
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            Import CSV / Excel
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="default" className="p-4">
          <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
            Total Leads
          </span>
          <p className="text-2xl font-bold text-[#5271ff] mt-1">{stats.total}</p>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
            Not Contacted
          </span>
          <p className="text-2xl font-bold text-[#5271ff] mt-1">{stats.notContactedCount}</p>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs font-bold text-[#5271ff] uppercase tracking-wider">
            Contacted
          </span>
          <p className="text-2xl font-bold text-[#5271ff] mt-1">{stats.contactedCount}</p>
        </Card>
      </div>

      <Card variant="default" className="p-6 space-y-6">
        <div className="flex items-center border-b border-[var(--surface-border)] space-x-6">
          {(
            [
              { id: 'LEADS', label: `Leads (${totalLeads})` },
              { id: 'HISTORY', label: 'Import History' },
              { id: 'RESEARCH', label: 'AI Research' },
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
                {(importHistory.length > 0 || manualLeadsCount > 0) && (
                  <Select
                    options={[
                      ...(manualLeadsCount > 0
                        ? [
                            {
                              value: 'MANUAL',
                              label: `Manual & Direct Leads (${manualLeadsCount})`,
                            },
                          ]
                        : []),
                      ...importHistory
                        .filter((h) => h.importedCount > 0)
                        .map((h) => ({
                          value: h.id,
                          label: `${h.fileName} (${h.importedCount})`,
                        })),
                    ]}
                    value={selectedDatasetId}
                    onChange={(val) => {
                      handleDatasetChange(val);
                    }}
                    className="w-64"
                  />
                )}
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

                {/* Columns Visibility Dropdown */}
                <div className="relative" ref={columnDropdownRef}>
                  <Button
                    variant="outline"
                    onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4 text-[var(--content-secondary)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 4.5v15m6-15v15m-10.5-15h15a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z"
                      />
                    </svg>
                    <span>Columns</span>
                    <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-500 text-[10px] font-semibold rounded-full">
                      {selectedColumns.length}
                    </span>
                  </Button>

                  {isColumnDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl shadow-2xl z-30 p-2.5 max-h-80 overflow-y-auto overscroll-contain space-y-1 text-xs">
                      {uploadedColumns && uploadedColumns.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between px-2 py-1 font-semibold text-[var(--content-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--surface-border)] pb-1.5 mb-1">
                            <span>
                              Spreadsheet Columns ({selectedColumns.length}/{uploadedColumns.length}
                              )
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllColumns}
                                className="text-brand-500 hover:text-brand-400 font-medium cursor-pointer text-[10px]"
                              >
                                Select All
                              </button>
                              <span className="text-[var(--content-tertiary)]">·</span>
                              <button
                                type="button"
                                onClick={handleClearAllColumns}
                                className="text-[var(--content-tertiary)] hover:text-red-400 font-medium cursor-pointer text-[10px]"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          {uploadedColumns.map((col) => (
                            <label
                              key={col}
                              className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[var(--surface-card)] rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedColumns.includes(col)}
                                onChange={() => toggleColumn(col)}
                                className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                              />
                              <span
                                className="text-[var(--content-primary)] truncate max-w-[180px]"
                                title={col}
                              >
                                {col}
                              </span>
                            </label>
                          ))}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-2 py-1 font-semibold text-[var(--content-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--surface-border)] pb-1.5 mb-1">
                            <span>Standard Columns ({selectedColumns.length})</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllColumns}
                                className="text-brand-500 hover:text-brand-400 font-medium cursor-pointer text-[10px]"
                              >
                                Select All
                              </button>
                              <span className="text-[var(--content-tertiary)]">·</span>
                              <button
                                type="button"
                                onClick={handleClearAllColumns}
                                className="text-[var(--content-tertiary)] hover:text-red-400 font-medium cursor-pointer text-[10px]"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          {[
                            { id: 'name', label: 'Name' },
                            { id: 'email', label: 'Email' },
                            { id: 'company', label: 'Company' },
                            { id: 'phone', label: 'Phone' },
                            { id: 'website', label: 'Website' },
                            { id: 'status', label: 'Status' },
                          ].map((col) => (
                            <label
                              key={col.id}
                              className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[var(--surface-card)] rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedColumns.includes(col.id)}
                                onChange={() => toggleColumn(col.id)}
                                className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                              />
                              <span className="text-[var(--content-primary)] font-medium">
                                {col.label}
                              </span>
                            </label>
                          ))}

                          {dynamicFieldKeys.length > 0 && (
                            <>
                              <div className="px-2 pt-2.5 pb-1 font-semibold text-[var(--content-tertiary)] uppercase text-[10px] tracking-wider border-t border-[var(--surface-border)] mt-2">
                                Dynamic Columns ({dynamicFieldKeys.length})
                              </div>
                              {dynamicFieldKeys.map((key) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[var(--surface-card)] rounded-lg cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(`custom_${key}`)}
                                    onChange={() => toggleColumn(`custom_${key}`)}
                                    className="rounded border-[var(--surface-border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                                  />
                                  <span
                                    className="text-[var(--content-primary)] truncate"
                                    title={key}
                                  >
                                    {key}
                                  </span>
                                </label>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedLeadIds.length > 0 && (
              <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-between text-sm animate-fade-in">
                <span className="text-[var(--content-primary)] font-medium">
                  {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="primary" onClick={() => setIsCreateCampaignOpen(true)}>
                    Send Email to Selected ({selectedLeadIds.length})
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                    Delete Selected ({selectedLeadIds.length})
                  </Button>
                </div>
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

        {activeTab === 'HISTORY' && (
          <ImportHistoryTable history={importHistory} isLoading={isHistoryLoading} />
        )}

        {activeTab === 'RESEARCH' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {(importHistory.length > 0 || manualLeadsCount > 0) && (
                  <Select
                    options={[
                      ...(manualLeadsCount > 0
                        ? [
                            {
                              value: 'MANUAL',
                              label: `Manual & Direct Leads (${manualLeadsCount})`,
                            },
                          ]
                        : []),
                      ...importHistory
                        .filter((h) => h.importedCount > 0)
                        .map((h) => ({
                          value: h.id,
                          label: `${h.fileName} (${h.importedCount})`,
                        })),
                    ]}
                    value={selectedDatasetId}
                    onChange={(val) => {
                      handleDatasetChange(val);
                    }}
                    className="w-64"
                  />
                )}
              </div>
            </div>

            <BulkResearchBar
              selectedCount={selectedLeadIds.length}
              onResearchSelected={handleBulkResearch}
              onSendEmailSelected={() => setIsCreateCampaignOpen(true)}
              onClear={() => setSelectedLeadIds([])}
              isResearching={isResearching}
            />

            <ResearchProgressCard progress={researchProgress} isRunning={isResearching} />

            <Table
              columns={researchColumns}
              data={researchLeads}
              loading={researchLeadsLoading}
              keyExtractor={(item) => item.id}
              emptyText="No leads found in this sheet. Import leads or select another sheet to view and research."
            />
          </div>
        )}
      </Card>

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(newImportHistoryId) => {
          fetchHistory();
          if (newImportHistoryId) {
            handleDatasetChange(newImportHistoryId);
          }
          fetchLeads();
        }}
      />

      <LeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        lead={editingLead}
        onSuccess={() => {
          fetchLeads();
          fetchHistory();
        }}
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
        onGenerateEmail={(lead) => {
          openEmailGenerator(lead.id, lead.name, lead.company);
        }}
      />

      <CompanyResearchDrawer
        isOpen={researchDrawerOpen}
        onClose={() => setResearchDrawerOpen(false)}
        leadId={researchDrawerLeadId}
        companyName={researchDrawerCompanyName}
        onResearchComplete={fetchResearchLeads}
        onGenerateEmail={(leadId, compName) => {
          const foundLead =
            leads.find((l) => l.id === leadId) || researchLeads.find((l) => l.id === leadId);
          openEmailGenerator(leadId, foundLead?.name, compName);
        }}
      />

      <EmailGeneratorDrawer
        isOpen={emailDrawerOpen}
        onClose={() => setEmailDrawerOpen(false)}
        leadId={emailDrawerLeadId}
        leadName={emailDrawerLeadName}
        companyName={emailDrawerCompanyName}
        onDraftSaved={() => {
          fetchLeads();
        }}
      />

      <CreateCampaignModal
        open={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
        initialSelectedLeadIds={selectedLeadIds}
        onCreated={() => {
          fetchLeads();
          setSelectedLeadIds([]);
        }}
      />

      <WhatsappPreviewModal
        open={waPreviewOpen}
        leadId={waLeadId}
        lead={waPreviewLead}
        datasetColumns={uploadedColumns || undefined}
        datasetName={selectedHistory?.fileName || 'Manual & Direct Leads'}
        leadName={waLeadName}
        companyName={waCompanyName}
        phone={waPhone}
        lastInboundMessageAt={waLastInboundMessageAt}
        onClose={() => setWaPreviewOpen(false)}
        onSent={() => fetchLeads()}
      />

      <WhatsappSendOptionsModal
        open={waBatchModalOpen}
        selectedLeadIds={selectedLeadIds}
        totalLeadsCount={totalLeads}
        onClose={() => setWaBatchModalOpen(false)}
        onSuccess={() => fetchLeads()}
      />

      {/* Individual Lead Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!leadToDelete}
        title="Delete Lead"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong className="text-[var(--content-primary)] font-semibold">
              "{leadToDelete?.name || 'this lead'}"
            </strong>
            {leadToDelete?.email && !leadToDelete.email.includes('@internal.mailflow') ? (
              <span className="text-[var(--content-secondary)]"> ({leadToDelete.email})</span>
            ) : null}
            ? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={isDeletingLead}
        onConfirm={confirmDeleteSingle}
        onCancel={() => {
          if (!isDeletingLead) setLeadToDelete(null);
        }}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        title="Delete Selected Leads"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong className="text-[var(--content-primary)] font-semibold">
              {selectedLeadIds.length} selected lead{selectedLeadIds.length > 1 ? 's' : ''}
            </strong>
            ? This action cannot be undone.
          </span>
        }
        confirmLabel={`Delete (${selectedLeadIds.length})`}
        variant="danger"
        loading={isBulkDeleting}
        onConfirm={confirmBulkDelete}
        onCancel={() => {
          if (!isBulkDeleting) setBulkDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
