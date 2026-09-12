import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/app/AppSidebar';
import { AppNavbar } from '../components/app/AppNavbar';
import { Drawer } from '../components/ui/Drawer/Drawer';
import { Modal } from '../components/ui/Modal/Modal';
import { Button } from '../components/ui';

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-none animate-fade-in relative">
          <div className="max-w-7xl mx-auto w-full pb-16">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Right-Edge "Give Feedback" Tab */}
      <button
        onClick={() => setFeedbackOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-brand-50 dark:bg-brand-950/60 border border-r-0 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold px-2 py-3.5 rounded-l-xl shadow-md [writing-mode:vertical-rl] rotate-180 flex items-center gap-1.5 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-all cursor-pointer"
        aria-label="Give Feedback"
      >
        <svg
          className="w-3.5 h-3.5 rotate-90 text-brand-600 dark:text-brand-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        Give Feedback
      </button>

      {/* Give Feedback Modal */}
      <Modal
        open={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false);
          setFeedbackSent(false);
          setFeedbackText('');
        }}
        title="Share Product Feedback"
        size="md"
      >
        <div className="space-y-4 py-2">
          {feedbackSent ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <p className="text-base font-semibold text-[var(--content-primary)]">
                Thank you for your feedback!
              </p>
              <p className="text-xs text-[var(--content-secondary)]">
                Our product engineering team reviews every suggestion to improve MailFlow.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--content-secondary)]">
                Have an idea or spotted something that could be better? Let us know!
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What can we improve about MailFlow..."
                className="w-full h-32 p-3 text-sm rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setFeedbackOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!feedbackText.trim()}
                  onClick={() => setFeedbackSent(true)}
                >
                  Send Feedback
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
