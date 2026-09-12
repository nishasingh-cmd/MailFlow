import { createContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { ToastContainer } from '../components/ui/Toast/Toast';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  removeToast: (id: string) => void;
  clearAll: () => void;
  toast: {
    success: (opts: ToastOptions | string) => string;
    error: (opts: ToastOptions | string) => string;
    warning: (opts: ToastOptions | string) => string;
    info: (opts: ToastOptions | string) => string;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
export { ToastContext };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const addToast = useCallback((variant: ToastVariant, options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    const now = Date.now();
    const lastTime = recentToastsRef.current.get(opts.title) || 0;

    // Deduplication throttle: Ignore duplicate identical alerts triggered in quick succession (<1.5s)
    if (now - lastTime < 1500) {
      return '';
    }
    recentToastsRef.current.set(opts.title, now);

    const id = `toast-${++idRef.current}`;
    const newToast: Toast = {
      id,
      variant,
      duration: 4000,
      ...opts,
    };
    setToasts((prev) => {
      // Prevent duplicate stacked alerts: remove any existing toast with the same title
      const filtered = prev.filter((t) => t.title !== newToast.title);
      const next = [...filtered, newToast];
      // Keep maximum 3 toasts visible at once
      return next.slice(-3);
    });
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    recentToastsRef.current.clear();
    setToasts([]);
  }, []);

  const toastHelpers = useMemo(
    () => ({
      success: (opts: ToastOptions | string) => addToast('success', opts),
      error: (opts: ToastOptions | string) => addToast('error', opts),
      warning: (opts: ToastOptions | string) => addToast('warning', opts),
      info: (opts: ToastOptions | string) => addToast('info', opts),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, removeToast, clearAll, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
