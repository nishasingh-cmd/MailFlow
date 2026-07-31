import React from 'react';
import { Card, Badge, BarChart } from '../ui';
import { LeadAnalytics } from '@mailflow/shared';

interface LeadAnalyticsSectionProps {
  analytics: LeadAnalytics;
}

export const LeadAnalyticsSection: React.FC<LeadAnalyticsSectionProps> = ({ analytics }) => {
  const chartData = analytics.industryDistribution.map((ind) => ({
    name: ind.name,
    value: ind.count,
  }));

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              Lead Analytics
            </h3>
            <p className="text-xs text-[var(--content-secondary)]">
              Source origins, duplication rates, and industry demographics.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            {analytics.totalLeads.toLocaleString()} Leads Total
          </Badge>
        </div>
      }
      padding="md"
      className="space-y-6"
    >
      {/* 4 Key Lead Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3.5 rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] space-y-1">
          <span className="text-[11px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Total Leads
          </span>
          <p className="text-xl font-bold text-[var(--content-primary)]">
            {analytics.totalLeads.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--content-secondary)]">All CRM Contacts</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3.5 rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] space-y-1">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Imported Leads
          </span>
          <p className="text-xl font-bold text-[var(--content-primary)]">
            {analytics.importedLeads.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--content-secondary)]">CSV &amp; Excel Imports</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3.5 rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] space-y-1">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
            Manual Leads
          </span>
          <p className="text-xl font-bold text-[var(--content-primary)]">
            {analytics.manualLeads.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--content-secondary)]">Direct Web Creation</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3.5 rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] space-y-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Duplicate Leads
          </span>
          <p className="text-xl font-bold text-[var(--content-primary)]">
            {analytics.duplicateLeads.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--content-secondary)]">Filtered on Import</p>
        </div>
      </div>

      {/* Industry Breakdown & Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Top Industries Distribution
          </h4>
          {chartData.length > 0 ? (
            <BarChart data={chartData} horizontal height={180} />
          ) : (
            <div className="flex items-center justify-center p-6 rounded-lg bg-[var(--surface-elevated,rgba(255,255,255,0.02))] border border-dashed border-[var(--border-subtle,rgba(255,255,255,0.08))] text-xs text-[var(--content-tertiary)]">
              No industry data available.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Geographic Coverage (Top Countries)
          </h4>
          {analytics.topCountries.length > 0 ? (
            <div className="space-y-2">
              {analytics.topCountries.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-elevated,rgba(255,255,255,0.03))]"
                >
                  <span className="text-xs font-medium text-[var(--content-primary)]">
                    {c.country}
                  </span>
                  <span className="text-xs font-semibold text-brand-400">
                    {c.count.toLocaleString()} leads
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 rounded-lg bg-[var(--surface-elevated,rgba(255,255,255,0.02))] border border-dashed border-[var(--border-subtle,rgba(255,255,255,0.08))] text-xs text-[var(--content-tertiary)]">
              No geographic data available.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
