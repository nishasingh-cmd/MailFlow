import { Breadcrumb } from './Breadcrumb';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';

export interface AppNavbarProps {
  onMobileMenuToggle?: () => void;
  className?: string;
}

export function AppNavbar({ onMobileMenuToggle, className }: AppNavbarProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={cn(
        'flex items-center justify-between gap-4 h-16 px-4 md:px-6',
        'bg-[var(--surface-card)] border-b border-[var(--surface-border)]',
        'sticky top-0 z-30 flex-shrink-0',
        className
      )}
      role="banner"
    >
      {/* Left side: Mobile menu toggle button + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <Breadcrumb />
      </div>

      {/* Right side: Theme toggle + Notifications + UserMenu */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
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

        {/* Notifications */}
        <NotificationDropdown />

        {/* User profile menu */}
        <UserMenu />
      </div>
    </header>
  );
}
