import { useState, useCallback, useRef } from 'react';

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

/**
 * useToast — manages a stack of toast notifications.
 * Returns helper methods for each variant and a list of active toasts.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((variant: ToastVariant, options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    const id = `toast-${++idRef.current}`;
    const toast: Toast = {
      id,
      variant,
      duration: 4000,
      ...opts,
    };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  return {
    toasts,
    removeToast,
    clearAll,
    toast: {
      success: (opts: ToastOptions | string) => addToast('success', opts),
      error: (opts: ToastOptions | string) => addToast('error', opts),
      warning: (opts: ToastOptions | string) => addToast('warning', opts),
      info: (opts: ToastOptions | string) => addToast('info', opts),
    },
  };
}
