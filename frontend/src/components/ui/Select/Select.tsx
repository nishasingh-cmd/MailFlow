import { type ReactNode, useRef, useState, useId, useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { useClickOutside } from '../../../hooks/useClickOutside';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  deleteTooltip?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  searchable?: boolean;
  leftIcon?: ReactNode;
  className?: string;
  triggerClassName?: string;
  id?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option…',
  error,
  hint,
  disabled = false,
  searchable = false,
  leftIcon,
  className,
  triggerClassName,
  id,
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useClickOutside(containerRef, () => setOpen(false));

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setSearch('');
  }, [open, searchable]);

  const selected = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--content-primary)]">
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={!!error}
          className={cn(
            'input-base flex items-center justify-between gap-2 text-left cursor-pointer',
            !selected && 'text-[var(--content-tertiary)]',
            error && 'input-error',
            disabled && 'input-disabled cursor-not-allowed',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {leftIcon && (
              <span className="text-[var(--content-tertiary)] flex-shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>

          <svg
            className={cn(
              'w-4 h-4 flex-shrink-0 text-[var(--content-tertiary)] transition-transform duration-150',
              open && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className={cn(
              'absolute z-50 mt-1.5 w-full rounded-xl border border-[var(--surface-border)]',
              'bg-[var(--surface-card)] shadow-dropdown backdrop-blur-sm',
              'animate-slide-up overflow-hidden'
            )}
            role="listbox"
            aria-label={label ?? 'Options'}
          >
            {searchable && (
              <div className="p-2 border-b border-[var(--surface-border)]">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-transparent text-sm text-[var(--content-primary)] placeholder:text-[var(--content-tertiary)] outline-none"
                />
              </div>
            )}

            <ul className="max-h-56 overflow-y-auto py-1 scrollbar-none">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--content-tertiary)]">No results</li>
              ) : (
                filtered.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                      option.value === value
                        ? 'text-brand-600 dark:text-brand-400 bg-brand-500/10 font-semibold'
                        : 'text-[var(--content-primary)] hover:bg-[var(--surface-hover)]',
                      option.disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.onDelete && (
                        <button
                          type="button"
                          title={option.deleteTooltip || 'Remove spreadsheet'}
                          aria-label={option.deleteTooltip || 'Remove spreadsheet'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            option.onDelete?.(e);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                      {option.value === value && (
                        <svg
                          className="w-4 h-4 text-brand-600 dark:text-brand-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--content-tertiary)]">{hint}</p>
      ) : null}
    </div>
  );
}
