import { cn } from '../../../utils/cn';

export interface LogoProps {
  /**
   * Display variant:
   * - 'full': Icon badge + wordmark
   * - 'mark': Icon badge only
   * - 'graphic': Original full graphic card image
   */
  variant?: 'full' | 'mark' | 'graphic';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Collapse to mark only (for sidebars) */
  collapsed?: boolean;
  /** Wordmark capitalization style */
  wordmarkStyle?: 'mixed' | 'uppercase';
  /** Container class */
  className?: string;
  /** Wordmark class */
  textClassName?: string;
}

export function LogoIcon({
  size = 'md',
  className,
}: {
  size?: LogoProps['size'];
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden flex-shrink-0 select-none shadow-sm shadow-[#5271ff]/30 transition-transform duration-200 hover:scale-[1.03]',
        sizeClasses[size],
        className
      )}
    >
      <img
        src="/logo-square.png"
        alt="MailFlow logo"
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          // Fallback to SVG if png fails to load for any reason
          (e.currentTarget as HTMLImageElement).src = '/logo-mark.svg';
        }}
      />
    </div>
  );
}

export function Logo({
  variant = 'full',
  size = 'md',
  collapsed = false,
  wordmarkStyle = 'mixed',
  className,
  textClassName,
}: LogoProps) {
  if (collapsed || variant === 'mark') {
    return <LogoIcon size={size} className={className} />;
  }

  if (variant === 'graphic') {
    const graphicSizes = {
      sm: 'w-24',
      md: 'w-32',
      lg: 'w-44',
      xl: 'w-56',
    };
    return (
      <div className={cn('inline-block overflow-hidden rounded-2xl shadow-lg', className)}>
        <img
          src="/logo.png"
          alt="MailFlow"
          className={cn('h-auto object-contain', graphicSizes[size])}
        />
      </div>
    );
  }

  const fontSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isCustomTextColor = Boolean(textClassName && textClassName.includes('text-'));

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <LogoIcon size={size} />
      <div className={cn('font-black tracking-tight leading-none', fontSizes[size], textClassName)}>
        {wordmarkStyle === 'uppercase' ? (
          <span
            className={cn(
              isCustomTextColor ? 'text-current' : 'text-slate-900 dark:text-white',
              'tracking-wider'
            )}
          >
            MAILFLOW
          </span>
        ) : (
          <>
            <span className={isCustomTextColor ? 'text-current' : 'text-slate-900 dark:text-white'}>
              Mail
            </span>
            <span className="text-[#5271ff] dark:text-[#6c85ff]">Flow</span>
          </>
        )}
      </div>
    </div>
  );
}
