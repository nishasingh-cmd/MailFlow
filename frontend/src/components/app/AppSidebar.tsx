import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, type SidebarSection } from '../ui/Sidebar/Sidebar';
import { Avatar } from '../ui/Avatar/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';

const icons = {
  dashboard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  email: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  chats: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  campaign: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  ),
  templates: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  contacts: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  automation: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  aiEmployee: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"
      />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
};

export interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  className?: string;
}

export function AppSidebar({
  collapsed = false,
  onToggle,
  onItemClick,
  className,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch {
      // ignore
    }
  };

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const userAvatar = user?.avatar ?? undefined;

  const sections: SidebarSection[] = [
    {
      items: [
        {
          id: ROUTES.DASHBOARD,
          label: 'Dashboard',
          icon: icons.dashboard,
          onClick: () => handleNav(ROUTES.DASHBOARD),
        },
        {
          id: ROUTES.EMAIL_OUTREACH,
          label: 'Email Outreach',
          icon: icons.email,
          onClick: () => handleNav(ROUTES.EMAIL_OUTREACH),
        },
        {
          id: ROUTES.WHATSAPP,
          label: 'WhatsApp Outreach',
          icon: icons.chats,
          onClick: () => handleNav(ROUTES.WHATSAPP),
        },
        {
          id: ROUTES.CAMPAIGNS,
          label: 'Campaign',
          icon: icons.campaign,
          onClick: () => handleNav(ROUTES.CAMPAIGNS),
        },
        {
          id: ROUTES.TEMPLATES,
          label: 'Templates',
          icon: icons.templates,
          onClick: () => handleNav(ROUTES.TEMPLATES),
        },
        {
          id: ROUTES.LEADS,
          label: 'Contacts',
          icon: icons.contacts,
          chevron: true,
          onClick: () => handleNav(ROUTES.LEADS),
        },
        {
          id: ROUTES.DELIVERY_LOGS,
          label: 'Automation',
          icon: icons.automation,
          onClick: () => handleNav(ROUTES.DELIVERY_LOGS),
        },
        {
          id: ROUTES.ANALYTICS,
          label: 'AI Employee',
          icon: icons.aiEmployee,
          onClick: () => handleNav(ROUTES.ANALYTICS),
        },
      ],
    },
    {
      items: [
        {
          id: ROUTES.SETTINGS,
          label: 'Settings',
          icon: icons.settings,
          onClick: () => handleNav(ROUTES.SETTINGS),
        },
        {
          id: 'logout',
          label: 'Logout',
          icon: icons.logout,
          onClick: handleLogout,
        },
      ],
    },
  ];

  return (
    <Sidebar
      sections={sections}
      activeId={location.pathname}
      collapsed={collapsed}
      onToggle={onToggle}
      className={className}
      logo={
        <div
          className={`flex items-center cursor-pointer select-none ${collapsed ? 'justify-center w-full' : 'gap-2.5 px-1'}`}
          onClick={() => handleNav(ROUTES.DASHBOARD)}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/30">
                <svg
                  className="w-4 h-4 -rotate-12 translate-x-[-0.5px] translate-y-[-0.5px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <div className="flex items-center text-xl font-bold tracking-tight">
                <span className="text-slate-900 dark:text-white">Mail</span>
                <span className="text-brand-600 dark:text-brand-400">Flow</span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/30">
              <svg
                className="w-4 h-4 -rotate-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
          )}
        </div>
      }
      footer={
        !collapsed ? (
          <div
            className="flex items-center gap-2.5 px-1 cursor-pointer"
            onClick={() => handleNav(ROUTES.SETTINGS)}
          >
            <Avatar name={userName} src={userAvatar} size="sm" online />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--content-primary)] truncate">
                {userName}
              </p>
              <p className="text-2xs text-[var(--content-tertiary)] truncate">{userEmail}</p>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-center cursor-pointer"
            onClick={() => handleNav(ROUTES.SETTINGS)}
          >
            <Avatar name={userName} src={userAvatar} size="sm" online />
          </div>
        )
      }
    />
  );
}
