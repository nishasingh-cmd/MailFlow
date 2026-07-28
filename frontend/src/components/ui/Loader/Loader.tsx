import { cn } from '../../../utils/cn';

export type LoaderVariant = 'spinner' | 'dots' | 'pulse';
export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';

export interface LoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  className?: string;
  label?: string;
}

const spinnerSizes: Record<LoaderSize, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

const dotSizes: Record<LoaderSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

function Spinner({ size, className }: { size: LoaderSize; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        spinnerSizes[size],
        className
      )}
      aria-hidden="true"
    />
  );
}

function Dots({ size, className }: { size: LoaderSize; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('rounded-full bg-current animate-bounce', dotSizes[size])}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function Pulse({ size, className }: { size: LoaderSize; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full bg-current animate-pulse',
        dotSizes[size],
        className
      )}
      aria-hidden="true"
    />
  );
}

export function Loader({
  variant = 'spinner',
  size = 'md',
  className,
  label = 'Loading…',
}: LoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center text-brand-400', className)}
    >
      {variant === 'spinner' && <Spinner size={size} />}
      {variant === 'dots' && <Dots size={size} />}
      {variant === 'pulse' && <Pulse size={size} />}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-screen centered overlay loader */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-bg)]"
      role="status"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader variant="spinner" size="lg" />
        <p className="text-sm text-[var(--content-secondary)]">{label}</p>
      </div>
    </div>
  );
}
