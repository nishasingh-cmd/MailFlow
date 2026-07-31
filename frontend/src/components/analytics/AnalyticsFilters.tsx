import React from 'react';
import { Button, Input, Select } from '../ui';
import { AnalyticsFilterInput, DateRangePreset } from '@mailflow/shared';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterInput;
  onChange: (newFilters: AnalyticsFilterInput) => void;
  onRefresh: () => void;
  onExportClick: () => void;
  campaignOptions: Array<{ id: string; name: string }>;
  industryOptions: string[];
  isRefreshing?: boolean;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onChange,
  onRefresh,
  onExportClick,
  campaignOptions,
  industryOptions,
  isRefreshing = false,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
}) => {
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const leadSourceOptions = [
    { value: 'ALL', label: 'All Lead Sources' },
    { value: 'IMPORTED', label: 'Imported (CSV/Excel)' },
    { value: 'MANUAL', label: 'Manual Additions' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'READY', label: 'Ready' },
    { value: 'SENDING', label: 'Sending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="space-y-4 bg-[var(--surface-card,#1E293B)] p-4 rounded-xl border border-[var(--border-default,rgba(255,255,255,0.08))] shadow-sm">
      {/* Top row: Search, Refresh, Export, Auto-Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search campaigns by name..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            leftIcon={
              <svg
                className="w-4 h-4 text-[var(--content-tertiary)]"
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onToggleAutoRefresh && (
            <button
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                autoRefreshEnabled
                  ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                  : 'bg-[var(--surface-elevated,rgba(255,255,255,0.04))] border-[var(--border-default)] text-[var(--content-secondary)]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-brand-400 animate-pulse' : 'bg-gray-500'}`}
              />
              Auto-Refresh
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={isRefreshing}
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            }
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onExportClick}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            }
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Bottom row: Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[var(--border-subtle,rgba(255,255,255,0.06))]">
        <div>
          <label className="block text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider mb-1">
            Date Range
          </label>
          <Select
            value={filters.dateRange || 'last_30_days'}
            onChange={(val) => onChange({ ...filters, dateRange: val as DateRangePreset })}
            options={dateRangeOptions}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider mb-1">
            Campaign
          </label>
          <Select
            value={filters.campaignId || 'ALL'}
            onChange={(val) => onChange({ ...filters, campaignId: val })}
            options={[
              { value: 'ALL', label: 'All Campaigns' },
              ...campaignOptions.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider mb-1">
            Campaign Status
          </label>
          <Select
            value={filters.status || 'ALL'}
            onChange={(val) => onChange({ ...filters, status: val })}
            options={statusOptions}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider mb-1">
            Lead Source
          </label>
          <Select
            value={filters.leadSource || 'ALL'}
            onChange={(val) => onChange({ ...filters, leadSource: val })}
            options={leadSourceOptions}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--content-tertiary)] uppercase tracking-wider mb-1">
            Industry
          </label>
          <Select
            value={filters.industry || 'ALL'}
            onChange={(val) => onChange({ ...filters, industry: val })}
            options={[
              { value: 'ALL', label: 'All Industries' },
              ...industryOptions.map((ind) => ({ value: ind, label: ind })),
            ]}
          />
        </div>
      </div>

      {/* Custom Date Picker inputs when custom selected */}
      {filters.dateRange === 'custom' && (
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex-1">
            <label className="block text-xs text-[var(--content-secondary)] mb-1">Start Date</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[var(--content-secondary)] mb-1">End Date</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
