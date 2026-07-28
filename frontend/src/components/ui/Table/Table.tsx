import { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Skeleton } from '../Skeleton/Skeleton';

export interface Column<T> {
  key: keyof T | string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: ReactNode;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
  stickyHeader?: boolean;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <span className="inline-flex flex-col ml-1.5" aria-hidden="true">
      <svg
        className={cn(
          'w-2.5 h-2.5 -mb-0.5',
          direction === 'asc' ? 'text-brand-400' : 'text-[var(--content-tertiary)]'
        )}
        fill="currentColor"
        viewBox="0 0 6 4"
      >
        <path d="M3 0l3 4H0z" />
      </svg>
      <svg
        className={cn(
          'w-2.5 h-2.5',
          direction === 'desc' ? 'text-brand-400' : 'text-[var(--content-tertiary)]'
        )}
        fill="currentColor"
        viewBox="0 0 6 4"
      >
        <path d="M3 4L0 0h6z" />
      </svg>
    </span>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyText = 'No data found',
  sortKey,
  sortDirection,
  onSort,
  className,
  stickyHeader = false,
}: TableProps<T>) {
  const alignClasses = { left: 'text-left', center: 'text-center', right: 'text-right' };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-[var(--surface-border)]',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead
            className={cn('bg-[var(--surface-elevated)]', stickyHeader && 'sticky top-0 z-10')}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wider',
                      'border-b border-[var(--surface-border)]',
                      alignClasses[col.align ?? 'left'],
                      col.sortable &&
                        'cursor-pointer select-none hover:text-[var(--content-primary)] transition-colors'
                    )}
                    onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}
                    aria-sort={
                      col.sortable
                        ? isSorted
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {col.sortable && (
                        <SortIcon direction={isSorted ? (sortDirection ?? null) : null} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <Skeleton variant="table-row" rows={5} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--content-tertiary)]"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row, i)}
                  className="border-b border-[var(--surface-border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3.5 text-[var(--content-primary)]',
                        alignClasses[col.align ?? 'left']
                      )}
                    >
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
