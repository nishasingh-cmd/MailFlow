import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

export type { Toast, ToastVariant, ToastOptions } from '../context/ToastContext';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('[MailFlow] useToast() must be used inside a <ToastProvider>.');
  }
  return context;
}
