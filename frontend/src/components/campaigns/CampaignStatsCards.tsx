import { CampaignStats } from '@mailflow/shared';
import { Skeleton } from '../ui';

interface CampaignStatsCardsProps {
  stats: CampaignStats | null;
  loading?: boolean;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

export function CampaignStatsCards({ stats, loading }: CampaignStatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: 'Total Campaigns',
      value: stats?.total ?? 0,
      gradient: 'from-brand-500/10 to-brand-600/5',
      iconBg: 'bg-brand-500/15 text-brand-400',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      label: 'Draft',
      value: stats?.draft ?? 0,
      gradient: 'from-zinc-500/10 to-zinc-600/5',
      iconBg: 'bg-zinc-500/15 text-zinc-400',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      label: 'Ready',
      value: stats?.ready ?? 0,
      gradient: 'from-blue-500/10 to-blue-600/5',
      iconBg: 'bg-blue-500/15 text-blue-400',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: stats?.completed ?? 0,
      gradient: 'from-green-500/10 to-green-600/5',
      iconBg: 'bg-green-500/15 text-green-400',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 space-y-3"
          >
            <Skeleton variant="text" className="w-24 h-3" />
            <Skeleton variant="text" className="w-12 h-7" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative rounded-xl border border-[var(--surface-border)] bg-gradient-to-br ${card.gradient} bg-[var(--surface-card)] p-5 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[var(--surface-hover)]`}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-[var(--content-secondary)] uppercase tracking-wider">
              {card.label}
            </p>
            <span className={`p-1.5 rounded-lg ${card.iconBg}`}>{card.icon}</span>
          </div>
          <p className="text-3xl font-bold text-[var(--content-primary)] tabular-nums">
            {card.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
