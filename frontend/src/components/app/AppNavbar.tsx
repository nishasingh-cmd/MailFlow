import { Breadcrumb } from './Breadcrumb';
import { cn } from '../../utils/cn';

export interface AppNavbarProps {
  onMobileMenuToggle?: () => void;
  className?: string;
}

export function AppNavbar({ onMobileMenuToggle, className }: AppNavbarProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-4 h-16 px-4 md:px-6',
        'bg-[#5271ff] border border-[#4462ea] rounded-2xl shadow-md shadow-[#5271ff]/20 text-white',
        'mx-4 md:mx-6 lg:mx-8 mt-4 mb-1 flex-shrink-0 z-20 transition-all',
        className
      )}
      role="banner"
    >
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors focus:outline-none"
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
    </header>
  );
}
