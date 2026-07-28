import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../../utils/cn';

export type ResizeMode = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
  resize?: ResizeMode;
}

const resizeClasses: Record<ResizeMode, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    hint,
    maxLength,
    showCount = false,
    resize = 'vertical',
    className,
    id,
    disabled,
    value,
    onChange,
    ...props
  },
  ref
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const hintId = `${textareaId}-hint`;
  const errorId = `${textareaId}-error`;

  const currentLength = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength !== undefined && currentLength >= maxLength * 0.9;
  const isAtLimit = maxLength !== undefined && currentLength >= maxLength;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-[var(--content-primary)]">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'input-base min-h-[100px]',
          resizeClasses[resize],
          error && 'input-error',
          disabled && 'input-disabled',
          className
        )}
        {...props}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {error ? (
            <p id={errorId} className="text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-xs text-[var(--content-tertiary)]">
              {hint}
            </p>
          ) : null}
        </div>

        {(showCount || maxLength !== undefined) && (
          <p
            className={cn(
              'text-xs flex-shrink-0',
              isAtLimit
                ? 'text-red-400'
                : isNearLimit
                  ? 'text-amber-400'
                  : 'text-[var(--content-tertiary)]'
            )}
            aria-live="polite"
          >
            {currentLength}
            {maxLength !== undefined && ` / ${maxLength}`}
          </p>
        )}
      </div>
    </div>
  );
});
