import { type ReactNode, useRef, useState, useId, useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { useClickOutside } from '../../../hooks/useClickOutside';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
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
        {/* Trigger */}
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
            disabled && 'input-disabled cursor-not-allowed'
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

          {/* Chevron */}
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

        {/* Dropdown */}
        {open && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full rounded-lg border border-[var(--surface-border)]',
              'bg-[var(--surface-elevated)] shadow-elevation-2',
              'animate-slide-up overflow-hidden'
            )}
            role="listbox"
            aria-label={label ?? 'Options'}
          >
            {/* Search */}
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

            {/* Options list */}
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
                      'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                      option.value === value
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-[var(--content-primary)] hover:bg-[var(--surface-hover)]',
                      option.disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {option.label}
                    {option.value === value && (
                      <svg
                        className="w-4 h-4 text-brand-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
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
