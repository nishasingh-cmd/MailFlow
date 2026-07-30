import { useState, useEffect, useCallback } from 'react';
import { Lead, PaginatedLeadsResponse } from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import { Input, Skeleton } from '../ui';
import { cn } from '../../utils/cn';

interface LeadPickerTableProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function LeadPickerTable({ selectedIds, onChange }: LeadPickerTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedLeadsResponse = await leadService.getLeads({
        search: search || undefined,
        page,
        limit: 8,
      });
      setLeads(result.leads);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchLeads(), 300);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  // When search changes, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [search]);

  const toggleLead = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    const pageIds = leads.map((l) => l.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...pageIds]));
      onChange(newIds);
    }
  };

  const pageIds = leads.map((l) => l.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          id="lead-picker-search"
          placeholder="Search leads by name, email, company..."
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
        <span className="text-sm font-medium text-brand-400 whitespace-nowrap">
          {selectedIds.length} selected
        </span>
      </div>

      <div className="rounded-lg border border-[var(--surface-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-elevated)]">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-[var(--surface-border)] accent-brand-500 cursor-pointer"
                  aria-label="Select all on page"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                Email
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell">
                Company
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5">
                      <Skeleton className="w-4 h-4 rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <Skeleton variant="text" className="w-32 h-3" />
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <Skeleton variant="text" className="w-40 h-3" />
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <Skeleton variant="text" className="w-24 h-3" />
                    </td>
                  </tr>
                ))
              : leads.map((lead) => {
                  const selected = selectedIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selected
                          ? 'bg-brand-500/8 hover:bg-brand-500/12'
                          : 'hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleLead(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-[var(--surface-border)] accent-brand-500 cursor-pointer"
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[var(--content-primary)]">{lead.name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--content-secondary)] hidden sm:table-cell">
                        {lead.email}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--content-secondary)] hidden md:table-cell">
                        {lead.company ?? '—'}
                      </td>
                    </tr>
                  );
                })}
            {!loading && leads.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-[var(--content-tertiary)] text-sm"
                >
                  {search ? 'No leads match your search.' : 'No leads available.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[var(--content-tertiary)]">{total} total leads</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--surface-border)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-[var(--content-tertiary)] px-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--surface-border)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
