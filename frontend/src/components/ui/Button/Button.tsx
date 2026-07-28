import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { Loader } from '../Loader/Loader';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-brand-500 text-white',
    'hover:bg-brand-600 active:bg-brand-700',
    'focus-visible:ring-brand-500',
    'shadow-sm hover:shadow-glow-brand',
    'disabled:bg-brand-800 disabled:text-brand-400',
  ].join(' '),
  secondary: [
    'bg-[var(--surface-elevated)] text-[var(--content-primary)]',
    'border border-[var(--surface-border)]',
    'hover:bg-[var(--surface-hover)] hover:border-zinc-600',
    'focus-visible:ring-zinc-400',
    'disabled:opacity-40',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--content-primary)]',
    'border border-[var(--surface-border)]',
    'hover:bg-[var(--surface-elevated)] hover:border-zinc-600',
    'focus-visible:ring-zinc-400',
    'disabled:opacity-40',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--content-secondary)]',
    'hover:bg-[var(--surface-elevated)] hover:text-[var(--content-primary)]',
    'focus-visible:ring-zinc-400',
    'disabled:opacity-40',
  ].join(' '),
  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-600 active:bg-red-700',
    'focus-visible:ring-red-500',
    'shadow-sm hover:shadow-glow-danger',
    'disabled:bg-red-900 disabled:text-red-400',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2.5 rounded-xl',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'relative inline-flex items-center justify-center font-medium',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--surface-bg)]',
        'disabled:cursor-not-allowed',
        'select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader variant="spinner" size={size === 'lg' ? 'sm' : 'xs'} className="text-current" />
          <span className="ml-2">{children}</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className={cn('flex-shrink-0', iconSizeClasses[size])} aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {children}
          {rightIcon && (
            <span className={cn('flex-shrink-0', iconSizeClasses[size])} aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});
