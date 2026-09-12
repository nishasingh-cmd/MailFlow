import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';
import { type Toast } from '../../../hooks/useToast';

export interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    bg: 'bg-green-600 border-green-500 shadow-glow-success',
    iconBg: 'bg-white/20 text-white',
    progress: 'bg-white/40',
  },
  error: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    bg: 'bg-red-600 border-red-500 shadow-glow-danger',
    iconBg: 'bg-white/20 text-white',
    progress: 'bg-white/40',
  },
  warning: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
    bg: 'bg-green-600 border-green-500 shadow-glow-success',
    iconBg: 'bg-white/20 text-white',
    progress: 'bg-white/40',
  },
  info: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
    ),
    bg: 'bg-green-600 border-green-500 shadow-glow-success',
    iconBg: 'bg-white/20 text-white',
    progress: 'bg-white/40',
  },
} as const;

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = variantConfig[toast.variant];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative flex items-start gap-3 w-full max-w-sm',
        'rounded-xl border px-4 py-3.5 text-white',
        'shadow-elevation-3 animate-fade-in overflow-hidden',
        config.bg
      )}
    >
      <span
        className={cn('flex-shrink-0 p-1.5 rounded-lg mt-0.5', config.iconBg)}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-white/90 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className={cn('absolute bottom-0 left-0 h-1 rounded-b-xl', config.progress)}
        style={{ animation: `progressDrain ${duration}ms linear forwards` }}
        aria-hidden="true"
      />

      <style>{`
        @keyframes progressDrain {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
}
