/**
 * useToast — consumes the global ToastContext.
 *
 * This hook now delegates to ToastContext instead of creating isolated per-component state.
 * All toast calls across the app share one centralized state and one ToastContainer
 * rendered inside ToastProvider in App.tsx.
 */
import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

// Re-export types so existing imports stay unchanged
export type { Toast, ToastVariant, ToastOptions } from '../context/ToastContext';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('[MailFlow] useToast() must be used inside a <ToastProvider>.');
  }
  return context;
}
