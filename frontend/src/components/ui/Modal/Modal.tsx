import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';
import { useKeyPress } from '../../../hooks/useKeyPress';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;

  persistent?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
  '4xl': 'max-w-5xl',
  '5xl': 'max-w-6xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  persistent = false,
  className,
}: ModalProps) {
  useKeyPress('Escape', onClose, open);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={persistent ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative w-full rounded-2xl',
          'bg-[var(--surface-card)] border border-[var(--surface-border)]',
          'shadow-elevation-3',
          'animate-scale-in',
          'flex flex-col max-h-[90vh]',
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--surface-border)] flex-shrink-0">
            <h2 id="modal-title" className="text-base font-semibold text-[var(--content-primary)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
              aria-label="Close dialog"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-[var(--content-secondary)] scrollbar-none">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--surface-border)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
