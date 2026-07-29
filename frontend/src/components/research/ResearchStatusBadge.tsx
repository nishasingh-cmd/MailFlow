import { ResearchStatus } from '@mailflow/shared';
import { cn } from '../../utils/cn';

interface ResearchStatusBadgeProps {
  status: ResearchStatus | null | undefined;
  className?: string;
  showPulse?: boolean;
}

const STATUS_CONFIG: Record<
  ResearchStatus,
  { label: string; bg: string; text: string; dot: string; ring: string }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
    ring: 'ring-zinc-500/25',
  },
  PROCESSING: {
    label: 'Processing',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    ring: 'ring-blue-500/25',
  },
  COMPLETED: {
    label: 'Researched',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    dot: 'bg-green-400',
    ring: 'ring-green-500/25',
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
    ring: 'ring-red-500/25',
  },
};

export function ResearchStatusBadge({
  status,
  className,
  showPulse = true,
}: ResearchStatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ring-1 ring-inset',
          'bg-zinc-500/10 text-zinc-500 ring-zinc-500/20',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
        Not Researched
      </span>
    );
  }

  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ring-1 ring-inset',
        config.bg,
        config.text,
        config.ring,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full inline-block', config.dot)}>
        {status === 'PROCESSING' && showPulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400" />
        )}
      </span>
      {config.label}
    </span>
  );
}
