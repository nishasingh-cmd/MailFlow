import { Outlet } from 'react-router-dom';

/**
 * AuthLayout — split-panel layout for public auth pages (Login, Register, ForgotPassword).
 *
 * Desktop: left brand panel (40%) + right form panel (60%)
 * Mobile: single-column, form only (brand panel hidden)
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-[var(--surface-bg)]">
      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative flex-col overflow-hidden">
        {/* Multi-layer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] via-[#0f0f1a] to-[#07070d]" />

        {/* Glowing orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-indigo-800/15 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-violet-700/10 blur-[80px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-brand flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">MailFlow</span>
          </div>

          {/* Main headline */}
          <div className="mt-auto pb-8">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Supercharge your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">
                outreach pipeline.
              </span>
            </h1>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed max-w-sm">
              Send smarter cold emails, manage leads, and track campaigns — all in one powerful
              platform.
            </p>

            {/* Feature bullets */}
            <ul className="mt-8 space-y-3">
              {[
                { icon: '⚡', text: 'Send 10,000 emails per day with 95%+ deliverability' },
                { icon: '🎯', text: 'AI-powered personalization at scale' },
                { icon: '📊', text: 'Real-time analytics and reply tracking' },
              ].map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="text-base mt-0.5 flex-shrink-0">{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="mt-10 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['AS', 'BM', 'CK', 'DJ'].map((initials, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-[#0f0f1a] flex items-center justify-center text-xs font-semibold text-white"
                      style={{
                        background: ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4'][i],
                      }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg
                        key={s}
                        className="w-3 h-3 text-amber-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Trusted by 2,400+ sales teams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-base font-bold text-[var(--content-primary)] tracking-tight">
            MailFlow
          </span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
