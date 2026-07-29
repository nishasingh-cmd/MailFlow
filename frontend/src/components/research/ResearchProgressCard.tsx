import { ResearchProgressResponse } from '@mailflow/shared';
import { Card } from '../ui';
import { ResearchStatusBadge } from './ResearchStatusBadge';

interface ResearchProgressCardProps {
  progress: ResearchProgressResponse | null;
  isRunning: boolean;
}

export function ResearchProgressCard({ progress, isRunning }: ResearchProgressCardProps) {
  if (!progress && !isRunning) return null;

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const failed = progress?.failed ?? 0;
  const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return (
    <Card variant="elevated" className="p-4 space-y-4 border border-brand-500/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <svg className="animate-spin w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          <span className="text-sm font-semibold text-[var(--content-primary)]">
            {isRunning ? 'Research in Progress...' : 'Research Complete'}
          </span>
        </div>
        {progress && (
          <span className="text-xs text-[var(--content-secondary)]">
            {completed + failed} / {total}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--content-tertiary)]">
            <span>{percent}% done</span>
            <span className="flex items-center gap-3">
              <span className="text-green-400">✓ {completed} completed</span>
              {failed > 0 && <span className="text-red-400">✗ {failed} failed</span>}
            </span>
          </div>
        </div>
      )}

      {/* Per-lead results */}
      {progress?.results && progress.results.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none">
          {progress.results.map((result, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-[var(--surface-bg)]"
            >
              <span className="text-[var(--content-secondary)] truncate mr-2 flex-1">
                {result.companyName || 'Unknown Company'}
              </span>
              <div className="shrink-0">
                <ResearchStatusBadge
                  status={result.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'}
                  showPulse={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading placeholder */}
      {isRunning && !progress && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-md shimmer" />
          ))}
        </div>
      )}
    </Card>
  );
}
