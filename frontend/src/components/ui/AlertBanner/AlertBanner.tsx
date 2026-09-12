import { useEffect } from 'react';

export interface AlertState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AlertBannerProps {
  alert: AlertState | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function AlertBanner({ alert, onDismiss, autoDismissMs = 5000 }: AlertBannerProps) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [alert, onDismiss, autoDismissMs]);

  if (!alert) return null;

  const isNegative = alert.type === 'error';

  return (
    <div
      role="alert"
      className={`w-full rounded-lg p-3.5 text-xs font-medium text-white flex items-center justify-between gap-3 animate-fade-in shadow-sm ${
        isNegative ? 'bg-red-600 border border-red-500' : 'bg-green-600 border border-green-500'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-sm leading-none">{isNegative ? '✕' : '✓'}</span>
        <span>{alert.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}
