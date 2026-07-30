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
  deliveryLogs: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  failedQueue: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
  whatsapp: (
    <svg fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
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
          onClick: () => handleNav(ROUTES.LEADS),
        },
        {
          id: ROUTES.CAMPAIGNS,
          label: 'Campaigns',
          icon: icons.campaigns,
          onClick: () => handleNav(ROUTES.CAMPAIGNS),
        },
      ],
    },
    {
      title: 'Delivery Engine',
      items: [
        {
          id: ROUTES.DELIVERY_LOGS,
          label: 'Delivery Logs',
          icon: icons.deliveryLogs,
          onClick: () => handleNav(ROUTES.DELIVERY_LOGS),
        },
        {
          id: ROUTES.FAILED_QUEUE,
          label: 'Failed Queue',
          icon: icons.failedQueue,
          onClick: () => handleNav(ROUTES.FAILED_QUEUE),
        },
        {
          id: ROUTES.WHATSAPP,
          label: 'WhatsApp',
          icon: icons.whatsapp,
          onClick: () => handleNav(ROUTES.WHATSAPP),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: ROUTES.ANALYTICS,
          label: 'Analytics',
          icon: icons.analytics,
          onClick: () => handleNav(ROUTES.ANALYTICS),
        },
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
