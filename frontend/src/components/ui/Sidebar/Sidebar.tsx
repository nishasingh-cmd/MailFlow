import { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  href?: string;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
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
        'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'bg-brand-500/15 text-brand-400'
          : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--content-primary)]',
        collapsed && 'justify-center'
      )}
    >
      {item.icon && (
        <span
          className={cn(
            'flex-shrink-0 w-5 h-5',
            active ? 'text-brand-400' : 'text-[var(--content-tertiary)]'
          )}
          aria-hidden="true"
        >
          {item.icon}
        </span>
      )}

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={cn(
                'flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center',
                active
                  ? 'bg-brand-500/30 text-brand-300'
                  : 'bg-[var(--surface-hover)] text-[var(--content-secondary)]'
              )}
            >
              {item.badge}
            </span>
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
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center flex-shrink-0 h-16 px-4 border-b border-[var(--surface-border)]',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        {logo}
        {!collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
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
            className="p-1.5 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Expand sidebar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {sections.map((section, si) => (
          <div key={si}>
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
        ))}
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="flex-shrink-0 border-t border-[var(--surface-border)] px-3 py-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
