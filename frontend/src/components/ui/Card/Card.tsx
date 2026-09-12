import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
  overflow?: 'hidden' | 'visible' | 'auto';
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-1',
  elevated:
    'bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-200',
  interactive: [
    'bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-1',
    'cursor-pointer transition-all duration-150',
    'hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-elevation-2 hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-elevation-1',
  ].join(' '),
};

const paddingClasses = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  variant = 'default',
  header,
  footer,
  padding = 'md',
  noBorder = false,
  overflow = 'visible',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        overflow === 'hidden'
          ? 'overflow-hidden'
          : overflow === 'auto'
            ? 'overflow-auto'
            : 'overflow-visible',
        variantClasses[variant],
        noBorder && 'border-0',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-5 border-b border-[var(--surface-border)] text-sm font-semibold text-[var(--content-primary)] rounded-t-2xl">
          {header}
        </div>
      )}

      <div className={cn(paddingClasses[padding])}>{children}</div>

      {footer && (
        <div className="px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-elevated)] rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
}
