import React from 'react';
import { Card, Badge } from '../ui';
import { WhatsappAnalytics } from '@mailflow/shared';

interface WhatsappAnalyticsSectionProps {
  analytics: WhatsappAnalytics;
}

export const WhatsappAnalyticsSection: React.FC<WhatsappAnalyticsSectionProps> = ({
  analytics,
}) => {
  return (
    <Card
      header={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              💬
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--content-primary)]">
                WhatsApp Outreach
              </h3>
              <p className="text-xs text-[var(--content-secondary)]">
                Direct mobile messaging queue and provider connectivity statuses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" dot>
              {analytics.mockProviderStatus}
            </Badge>
            <Badge variant="neutral" size="sm">
              {analytics.futureProviderStatus}
            </Badge>
          </div>
        </div>
      }
      padding="md"
      className="space-y-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Queued
          </span>
          <p className="text-lg font-bold text-amber-400">{analytics.queued.toLocaleString()}</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Sending
          </span>
          <p className="text-lg font-bold text-blue-400">{analytics.sending.toLocaleString()}</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Sent
          </span>
          <p className="text-lg font-bold text-emerald-400">{analytics.sent.toLocaleString()}</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Failed
          </span>
          <p className="text-lg font-bold text-red-400">{analytics.failed.toLocaleString()}</p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Cancelled
          </span>
          <p className="text-lg font-bold text-[var(--content-tertiary)]">
            {analytics.cancelled.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
};
