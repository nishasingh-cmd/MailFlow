import React from 'react';
import { Card, Badge } from '../ui';
import { AnalyticsSummary, SummaryStatCard } from '@mailflow/shared';

interface AnalyticsStatCardsProps {
  summary: AnalyticsSummary;
}

export const AnalyticsStatCards: React.FC<AnalyticsStatCardsProps> = ({ summary }) => {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'users':
        return (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case 'megaphone':
        return (
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
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c.41 0 .789-.222.986-.583l.89-1.637A1.75 1.75 0 0112.247 3h.506a1.75 1.75 0 011.54 2.583l-.89 1.637c-.197.361-.177.794.053 1.134l3.183 4.693c.47.693.308 1.638-.363 2.128l-.517.378a1.75 1.75 0 01-2.03-.024l-3.3-2.433a1.75 1.75 0 00-1.037-.341H7c-.57 0-1.114.218-1.564.607z"
            />
          </svg>
        );
      case 'mail-sent':
        return (
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
              d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5m11.25-4.5L14.25 14.5"
            />
          </svg>
        );
      case 'mail-pending':
        return (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'mail-failed':
        return (
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'whatsapp':
        return (
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        );
      case 'eye':
        return (
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        );
      case 'reply':
        return (
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
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
    }
  };

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'users':
        return 'bg-blue-500/10 text-blue-400';
      case 'megaphone':
        return 'bg-purple-500/10 text-purple-400';
      case 'mail-sent':
        return 'bg-brand-500/10 text-brand-400';
      case 'mail-pending':
        return 'bg-amber-500/10 text-amber-400';
      case 'mail-failed':
        return 'bg-red-500/10 text-red-400';
      case 'whatsapp':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'eye':
        return 'bg-teal-500/10 text-teal-400';
      case 'reply':
        return 'bg-indigo-500/10 text-indigo-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const cardsList: SummaryStatCard[] = [
    summary.totalLeads,
    summary.totalCampaigns,
    summary.emailsSent,
    summary.emailsPending,
    summary.emailsFailed,
    summary.whatsappSent,
    summary.whatsappPending,
    summary.whatsappFailed,
    summary.openRate,
    summary.replyRate,
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cardsList.map((card, idx) => (
        <Card key={idx} variant="elevated" padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider truncate">
              {card.title}
            </span>
            <span className={`p-2 rounded-lg ${getIconColor(card.icon)} flex-shrink-0`}>
              {getIcon(card.icon)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </span>

            {card.trend.percentage > 0 && (
              <Badge
                variant={
                  card.trend.direction === 'up'
                    ? 'success'
                    : card.trend.direction === 'down'
                      ? 'error'
                      : 'neutral'
                }
                size="sm"
                className="flex items-center gap-0.5"
              >
                {card.trend.direction === 'up' ? '↑' : card.trend.direction === 'down' ? '↓' : '•'}
                {card.trend.percentage}%
              </Badge>
            )}
          </div>

          <p className="text-[11px] text-[var(--content-tertiary)] truncate">{card.trend.label}</p>
        </Card>
      ))}
    </div>
  );
};
