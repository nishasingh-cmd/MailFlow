import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, type SidebarSection } from '../ui/Sidebar/Sidebar';
import { Avatar } from '../ui/Avatar/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';

/* Icons for sidebar navigation */
const icons = {
  dashboard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  leads: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  campaigns: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  analytics: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
  const { user } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    onItemClick?.();
  };

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const userAvatar = user?.avatar ?? undefined;

  const sections: SidebarSection[] = [
    {
      title: 'Navigation',
      items: [
        {
          id: ROUTES.DASHBOARD,
          label: 'Dashboard',
          icon: icons.dashboard,
          onClick: () => handleNav(ROUTES.DASHBOARD),
        },
        {
          id: ROUTES.LEADS,
          label: 'Leads',
          icon: icons.leads,
          badge: 12,
          onClick: () => handleNav(ROUTES.LEADS),
        },
        {
          id: ROUTES.CAMPAIGNS,
          label: 'Campaigns',
          icon: icons.campaigns,
          onClick: () => handleNav(ROUTES.CAMPAIGNS),
        },
        {
          id: ROUTES.ANALYTICS,
          label: 'Analytics',
          icon: icons.analytics,
          onClick: () => handleNav(ROUTES.ANALYTICS),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: ROUTES.SETTINGS,
          label: 'Settings',
          icon: icons.settings,
          onClick: () => handleNav(ROUTES.SETTINGS),
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
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => handleNav(ROUTES.DASHBOARD)}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
            M
          </div>
          {!collapsed && (
            <span className="font-bold text-base text-[var(--content-primary)] tracking-tight">
              MailFlow
            </span>
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
