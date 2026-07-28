import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--surface-card)] border border-[var(--surface-border)]',
  elevated: 'bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2',
  interactive: [
    'bg-[var(--surface-card)] border border-[var(--surface-border)]',
    'cursor-pointer transition-all duration-150',
    'hover:border-zinc-600 hover:shadow-elevation-2 hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-elevation-1',
  ].join(' '),
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  header,
  footer,
  padding = 'md',
  noBorder = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        variantClasses[variant],
        noBorder && 'border-0',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 border-b border-[var(--surface-border)] text-sm font-semibold text-[var(--content-primary)]">
          {header}
        </div>
      )}

      <div className={cn(paddingClasses[padding])}>{children}</div>

      {footer && (
        <div className="px-5 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-elevated)]">
          {footer}
        </div>
      )}
    </div>
  );
}
