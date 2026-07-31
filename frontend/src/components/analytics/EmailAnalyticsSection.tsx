import React from 'react';
import { Card, Badge } from '../ui';
import { EmailAnalytics } from '@mailflow/shared';

interface EmailAnalyticsSectionProps {
  analytics: EmailAnalytics;
}

export const EmailAnalyticsSection: React.FC<EmailAnalyticsSectionProps> = ({ analytics }) => {
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              ✉️
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--content-primary)]">
                Email Delivery Engine
              </h3>
              <p className="text-xs text-[var(--content-secondary)]">
                SMTP queue performance, retries, and delivery speeds.
              </p>
            </div>
          </div>

          <Badge
            variant={
              analytics.successRate >= 90
                ? 'success'
                : analytics.successRate >= 75
                  ? 'warning'
                  : 'error'
            }
          >
            {analytics.successRate}% Deliverability Success Rate
          </Badge>
        </div>
      }
      padding="md"
      className="space-y-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            Total Retries
          </span>
          <p className="text-lg font-bold text-purple-400">
            {analytics.retryCount.toLocaleString()}
          </p>
        </div>

        <div className="bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3 rounded-lg border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
            Avg Delivery Time
          </span>
          <p className="text-lg font-bold text-[var(--content-primary)]">
            {formatTime(analytics.avgDeliveryTimeSeconds)}
          </p>
        </div>
      </div>
    </Card>
  );
};
