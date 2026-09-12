import { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
  bottom?: boolean;
}

export interface SidebarProps {
  sections: SidebarSection[];
  activeId?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  logo?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Tag = item.href ? 'a' : 'button';
  const tagProps = item.href
    ? { href: item.href }
    : { type: 'button' as const, onClick: item.onClick };

  return (
    <Tag
      {...(tagProps as React.AnchorHTMLAttributes<HTMLAnchorElement> &
        React.ButtonHTMLAttributes<HTMLButtonElement>)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 font-semibold shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white',
        collapsed && 'justify-center px-2'
      )}
    >
      {item.icon && (
        <span
          className={cn(
            'flex-shrink-0 w-5 h-5 flex items-center justify-center transition-colors',
            active
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          )}
          aria-hidden="true"
        >
          {item.icon}
        </span>
      )}

      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={cn(
                'flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center',
                active
                  ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300'
                  : 'bg-[var(--surface-hover)] text-[var(--content-secondary)]'
              )}
            >
              {item.badge}
            </span>
          )}
          {item.chevron && (
            <svg
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-transform text-slate-400 dark:text-slate-500',
                active ? 'text-brand-500' : ''
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </>
      )}
    </Tag>
  );
}

export function Sidebar({
  sections,
  activeId,
  collapsed = false,
  onToggle,
  logo,
  footer,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[var(--surface-card)] border-r border-[var(--surface-border)]',
        'transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex items-center flex-shrink-0 h-16 border-b border-[var(--surface-border)] relative',
          collapsed ? 'justify-center px-0' : 'px-4 gap-3'
        )}
      >
        <div className={cn('flex items-center', collapsed ? 'justify-center w-full' : '')}>
          {logo}
        </div>
        {!collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto w-7 h-7 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] text-[var(--content-tertiary)] hover:text-[var(--content-primary)] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            aria-label="Collapse sidebar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        {collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-md flex items-center justify-center text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] hover:scale-110 transition-all cursor-pointer"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col overflow-y-auto px-3 py-4 scrollbar-none">
        {sections.map((section, si) => {
          const isBottom = section.bottom || (si === sections.length - 1 && sections.length > 1);
          return (
            <div
              key={si}
              className={cn(
                isBottom ? 'mt-auto pt-3 border-t border-[var(--surface-border)]' : 'space-y-1 mb-2'
              )}
            >
              {section.title && !collapsed && (
                <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-widest text-[var(--content-tertiary)]">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5" role="list">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <NavItem item={item} active={item.id === activeId} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {footer && (
        <div className="flex-shrink-0 border-t border-[var(--surface-border)] px-3 py-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
