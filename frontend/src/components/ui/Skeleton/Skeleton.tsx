import { cn } from '../../../utils/cn';

export type SkeletonVariant = 'text' | 'avatar' | 'card' | 'table-row' | 'rect';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  lines?: number;
  /** Number of table-row repetitions */
  rows?: number;
}

const base = 'shimmer rounded bg-[var(--surface-elevated)]';

function SkeletonRect({ className }: { className?: string }) {
  return <div className={cn(base, className)} aria-hidden="true" />;
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonRect
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

function SkeletonAvatar({ className }: { className?: string }) {
  return <SkeletonRect className={cn('w-10 h-10 rounded-full', className)} />;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 flex flex-col gap-4',
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonRect className="h-4 w-1/3" />
          <SkeletonRect className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-1">
        <SkeletonRect className="h-8 w-20" />
        <SkeletonRect className="h-8 w-16" />
      </div>
    </div>
  );
}

function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 py-3 border-b border-[var(--surface-border)]',
        className
      )}
      aria-hidden="true"
    >
      <SkeletonRect className="h-4 w-4 flex-shrink-0" />
      <SkeletonAvatar className="w-8 h-8 flex-shrink-0" />
      <SkeletonRect className="h-4 flex-1" />
      <SkeletonRect className="h-4 w-24" />
      <SkeletonRect className="h-6 w-16 rounded-full" />
      <SkeletonRect className="h-4 w-20" />
    </div>
  );
}

export function Skeleton({ variant = 'rect', className, lines, rows = 5 }: SkeletonProps) {
  switch (variant) {
    case 'text':
      return <SkeletonText lines={lines} className={className} />;
    case 'avatar':
      return <SkeletonAvatar className={className} />;
    case 'card':
      return <SkeletonCard className={className} />;
    case 'table-row':
      return (
        <div role="status" aria-label="Loading…">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} className={className} />
          ))}
          <span className="sr-only">Loading content…</span>
        </div>
      );
    default:
      return <SkeletonRect className={cn('h-4 w-full', className)} />;
  }
}
