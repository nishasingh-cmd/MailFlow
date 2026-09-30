import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '../components/app/AppSidebar';
import { AppNavbar } from '../components/app/AppNavbar';
import { Drawer } from '../components/ui/Drawer/Drawer';

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Prevent browser's automatic window scroll restoration from conflicting with container scroll
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Reusable route-change scroll restoration:
  // Whenever pathname changes (e.g. navigating to /whatsapp), reset the scroll container to top.
  // Query parameter changes (e.g. switching ?tab=history on /whatsapp) do not reset scroll.
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-bg)] text-[var(--content-primary)] relative">
      <div className="hidden md:flex flex-shrink-0 h-full">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" width="w-64">
        <div className="h-full -m-5">
          <AppSidebar onItemClick={() => setMobileOpen(false)} className="w-full border-r-0" />
        </div>
      </Drawer>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AppNavbar onMobileMenuToggle={() => setMobileOpen(true)} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 scrollbar-none animate-fade-in relative"
        >
          <div className="max-w-7xl mx-auto w-full pb-16 space-y-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
