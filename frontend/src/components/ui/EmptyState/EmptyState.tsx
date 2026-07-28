import { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { wrapper: 'py-8', icon: 'w-10 h-10', title: 'text-sm', desc: 'text-xs', gap: 'gap-3' },
  md: { wrapper: 'py-12', icon: 'w-14 h-14', title: 'text-base', desc: 'text-sm', gap: 'gap-4' },
  lg: { wrapper: 'py-20', icon: 'w-20 h-20', title: 'text-xl', desc: 'text-base', gap: 'gap-5' },
};

const actionVariantClasses = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm hover:shadow-glow-brand',
  secondary:
    'bg-[var(--surface-elevated)] text-[var(--content-primary)] border border-[var(--surface-border)] hover:bg-[var(--surface-hover)]',
  outline:
    'bg-transparent text-[var(--content-primary)] border border-[var(--surface-border)] hover:bg-[var(--surface-elevated)]',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sc = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center w-full',
        sc.wrapper,
        sc.gap,
        className
      )}
      role="status"
    >
      {/* Icon */}
      {icon ? (
        <span className={cn('text-[var(--content-tertiary)]', sc.icon)} aria-hidden="true">
          {icon}
        </span>
      ) : (
        <div
          className={cn(
            'rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--content-tertiary)]',
            sc.icon
          )}
          aria-hidden="true"
        >
          <svg
            className="w-1/2 h-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col gap-1.5 max-w-xs">
        <h3 className={cn('font-semibold text-[var(--content-primary)]', sc.title)}>{title}</h3>
        {description && (
          <p className={cn('text-[var(--content-secondary)] leading-relaxed', sc.desc)}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                'inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                actionVariantClasses[action.variant ?? 'primary']
              )}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className={cn(
                'inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                actionVariantClasses[secondaryAction.variant ?? 'outline']
              )}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
