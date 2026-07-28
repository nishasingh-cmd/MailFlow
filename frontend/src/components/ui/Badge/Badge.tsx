import { type HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500/15 text-green-400 ring-green-500/25',
  warning: 'bg-amber-500/15 text-amber-400 ring-amber-500/25',
  error: 'bg-red-500/15 text-red-400 ring-red-500/25',
  info: 'bg-blue-500/15 text-blue-400 ring-blue-500/25',
  neutral: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/25',
  brand: 'bg-brand-500/15 text-brand-400 ring-brand-500/25',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-zinc-400',
  brand: 'bg-brand-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block rounded-full',
            dotClasses[variant],
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
