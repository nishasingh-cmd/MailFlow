import { ReactNode } from 'react';
import { Button } from '../Button/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto ${
            variant === 'danger' ? 'bg-red-500/15 text-red-400' : 'bg-brand-500/15 text-brand-400'
          }`}
        >
          {variant === 'danger' ? '⚠️' : '❓'}
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3
            id="confirm-modal-title"
            className="text-lg font-semibold text-[var(--content-primary)]"
          >
            {title}
          </h3>
          <div className="text-sm text-[var(--content-secondary)] leading-relaxed">
            {description}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'primary' : 'primary'}
            className={`flex-1 ${
              variant === 'danger' ? '!bg-red-500 hover:!bg-red-600 !border-red-500' : ''
            }`}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
