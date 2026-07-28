import { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface NavbarUser {
  name: string;
  avatar?: string;
}

export interface NavbarProps {
  logo?: ReactNode;
  navItems?: ReactNode;
  onThemeToggle?: () => void;
  isDark?: boolean;
  user?: NavbarUser;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onUserClick?: () => void;
  className?: string;
  rightSlot?: ReactNode;
}

export function Navbar({
  logo,
  navItems,
  onThemeToggle,
  isDark = true,
  user,
  notificationCount,
  onNotificationClick,
  onUserClick,
  className,
  rightSlot,
}: NavbarProps) {
  return (
    <header
      className={cn(
        'flex items-center gap-4 h-16 px-4 md:px-6',
        'bg-[var(--surface-card)] border-b border-[var(--surface-border)]',
        'sticky top-0 z-40',
        className
      )}
      role="banner"
    >
      {/* Logo / Brand */}
      {logo && <div className="flex items-center flex-shrink-0">{logo}</div>}

      {/* Nav items */}
      {navItems && <nav className="hidden md:flex items-center gap-1 ml-2">{navItems}</nav>}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {rightSlot}

        {/* Theme Toggle */}
        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
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
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
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
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onNotificationClick}
          className="relative p-2 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
          aria-label={notificationCount ? `${notificationCount} notifications` : 'Notifications'}
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {notificationCount !== undefined && notificationCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-[var(--surface-card)]"
              aria-hidden="true"
            />
          )}
        </button>

        {/* User avatar */}
        {user && (
          <button
            onClick={onUserClick}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label={`User menu for ${user.name}`}
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-semibold text-brand-400 flex-shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--content-primary)] max-w-[120px] truncate">
              {user.name}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
