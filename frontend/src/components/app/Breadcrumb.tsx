import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ROUTE_LABELS } from '../../routes/routes';

/**
 * Breadcrumb — derives navigation trail from the current URL path.
 * Uses react-router-dom's useLocation() to build the crumb list dynamically.
 */
export function Breadcrumb({ className }: { className?: string }) {
  const { pathname } = useLocation();

  // Build crumbs from path segments, skipping empty strings
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('hidden sm:flex items-center gap-1.5 text-sm', className)}
    >
      <ol className="flex items-center gap-1.5" role="list">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg
                className="w-3.5 h-3.5 text-[var(--content-tertiary)] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}

            {crumb.isLast ? (
              <span
                className="font-medium text-[var(--content-primary)] truncate max-w-[160px]"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors truncate max-w-[120px]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
