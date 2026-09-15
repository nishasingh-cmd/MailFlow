import { useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { useToast, type Toast } from '../../../hooks/useToast';

export interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: '✓',
    bg: 'bg-green-600 border border-green-500 shadow-sm',
  },
  error: {
    icon: '✕',
    bg: 'bg-red-600 border border-red-500 shadow-sm',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-amber-600 border border-amber-500 shadow-sm',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-600 border border-blue-500 shadow-sm',
  },
} as const;

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = variantConfig[toast.variant] || variantConfig.info;
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full rounded-xl p-3.5 text-xs sm:text-sm font-medium text-white flex items-center justify-between gap-3 shadow-2xl animate-slide-up transition-all',
        config.bg
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-bold text-sm leading-none shrink-0">{config.icon}</span>
        <span className="min-w-0 break-words">{toast.title || toast.description}</span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts?: Toast[];
  onRemove?: (id: string) => void;
  className?: string;
}

export function ToastContainer({
  toasts: propToasts,
  onRemove: propOnRemove,
  className,
}: ToastContainerProps = {}) {
  const { toasts: ctxToasts, removeToast } = useToast();
  const toasts = propToasts ?? ctxToasts ?? [];
  const onRemove = propOnRemove ?? removeToast;

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-5 right-4 md:right-8 z-[9999] pointer-events-none flex flex-col gap-2.5 items-end transition-all duration-200',
        className
      )}
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="w-full max-w-sm pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
