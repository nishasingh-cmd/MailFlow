import { useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Badge } from '../ui/Badge/Badge';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'success' | 'info' | 'warning';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'New campaign completed',
    description: 'Q1 Product Launch reached 4,821 contacts with 42% open rate.',
    time: '10m ago',
    unread: true,
    type: 'success',
  },
  {
    id: '2',
    title: 'Email delivery finished',
    description: 'Batch #402 delivered 500 emails successfully.',
    time: '1h ago',
    unread: true,
    type: 'info',
  },
  {
    id: '3',
    title: 'SMTP rate limit warning',
    description: 'SendGrid account is at 85% of daily quota.',
    time: '3h ago',
    unread: false,
    type: 'warning',
  },
  {
    id: '4',
    title: 'New lead imported',
    description: '50 new leads imported from CSV import.',
    time: '1d ago',
    unread: false,
    type: 'info',
  },
];

export function NotificationDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        className="relative p-2 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
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

        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-[var(--surface-card)]"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-80 sm:w-96 z-50',
            'rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)]',
            'shadow-elevation-3 animate-scale-in origin-top-right overflow-hidden'
          )}
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-border)]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--content-primary)]">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="brand" size="sm">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--surface-border)] scrollbar-none">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-sm text-[var(--content-tertiary)]">
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3.5 flex items-start gap-3 transition-colors hover:bg-[var(--surface-hover)]',
                    item.unread && 'bg-brand-500/5'
                  )}
                >
                  {/* Status Indicator */}
                  <span
                    className={cn(
                      'w-2 h-2 mt-1.5 rounded-full flex-shrink-0',
                      item.type === 'success' && 'bg-green-400',
                      item.type === 'info' && 'bg-blue-400',
                      item.type === 'warning' && 'bg-amber-400'
                    )}
                    aria-hidden="true"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--content-primary)] truncate">
                        {item.title}
                      </p>
                      <span className="text-2xs text-[var(--content-tertiary)] flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--content-secondary)] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
