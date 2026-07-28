import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/Avatar/Avatar';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';

const menuItems = [
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function UserMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useClickOutside(ref, () => setOpen(false));

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const userAvatar = user?.avatar ?? undefined;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const handleNavigate = (id: string) => {
    setOpen(false);
    if (id === 'settings' || id === 'profile') {
      navigate(ROUTES.SETTINGS);
    }
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <Avatar name={userName} src={userAvatar} size="sm" online />
        <span className="hidden md:block text-sm font-medium text-[var(--content-primary)] max-w-[120px] truncate">
          {userName}
        </span>
        <svg
          className={cn(
            'hidden md:block w-3.5 h-3.5 text-[var(--content-tertiary)] transition-transform duration-150',
            open && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-60 z-50',
            'rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)]',
            'shadow-elevation-3 animate-scale-in origin-top-right'
          )}
          role="menu"
          aria-label="User menu"
        >
          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--surface-border)]">
            <Avatar name={userName} src={userAvatar} size="md" online />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--content-primary)] truncate">
                {userName}
              </p>
              <p className="text-xs text-[var(--content-tertiary)] truncate">{userEmail}</p>
            </div>
          </div>

          {/* Menu items */}
          <ul className="py-1.5" role="none">
            {menuItems.map((item) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate(item.id)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <span className="text-[var(--content-tertiary)]" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Divider + Logout */}
          <div className="border-t border-[var(--surface-border)] py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
