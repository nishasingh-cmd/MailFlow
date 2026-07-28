import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';
import { useKeyPress } from '../../../hooks/useKeyPress';

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  children,
  footer,
  width = 'w-80',
}: DrawerProps) {
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
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative flex flex-col h-full',
          'bg-[var(--surface-card)] border-[var(--surface-border)]',
          'shadow-elevation-3',
          width,
          side === 'right'
            ? ['ml-auto border-l', open ? 'animate-slide-left' : '']
            : ['mr-auto border-r', open ? 'animate-slide-right' : '']
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--surface-border)] flex-shrink-0">
          {title ? (
            <h2 className="text-base font-semibold text-[var(--content-primary)]">{title}</h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Close drawer"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-[var(--content-secondary)] scrollbar-none">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--surface-border)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
