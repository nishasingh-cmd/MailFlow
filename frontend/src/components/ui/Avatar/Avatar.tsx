import { type ImgHTMLAttributes, useState } from 'react';
import { cn } from '../../../utils/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  src?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const indicatorSizeClasses: Record<AvatarSize, string> = {
  xs: 'w-1.5 h-1.5 ring-1',
  sm: 'w-2 h-2 ring-1',
  md: 'w-2.5 h-2.5 ring-2',
  lg: 'w-3 h-3 ring-2',
  xl: 'w-3.5 h-3.5 ring-2',
};

/** Deterministically pick a color from the user's name */
function getInitialsColor(name: string): string {
  const colors = [
    'bg-violet-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-green-500',
    'bg-rose-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 'md', online, src, className, alt, ...props }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <span className={cn('relative inline-flex flex-shrink-0', sizeClasses[size])}>
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? 'avatar'}
          onError={() => setImgError(true)}
          className={cn('rounded-full object-cover w-full h-full', className)}
          {...props}
        />
      ) : (
        <span
          aria-label={name ? `Avatar for ${name}` : 'Avatar'}
          className={cn(
            'flex items-center justify-center rounded-full font-semibold text-white select-none w-full h-full',
            name ? getInitialsColor(name) : 'bg-zinc-600',
            className
          )}
        >
          {name ? getInitials(name) : '?'}
        </span>
      )}

      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-[var(--surface-bg)]',
            indicatorSizeClasses[size],
            online ? 'bg-green-400' : 'bg-zinc-500'
          )}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}
