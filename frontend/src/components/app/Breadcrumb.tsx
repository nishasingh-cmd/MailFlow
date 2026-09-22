import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ROUTE_LABELS } from '../../routes/routes';

function isId(segment: string): boolean {
  // CUID (e.g. cmucvt7r9000114mbi...), UUID, Mongo ObjectId, or long alphanumeric ID
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
    /^[0-9a-f]{24}$/i.test(segment) ||
    /^c[a-z0-9]{20,}$/i.test(segment) ||
    (segment.length > 12 && /\d/.test(segment) && /[a-z]/i.test(segment))
  );
}

export function Breadcrumb({ className }: { className?: string }) {
  const { pathname } = useLocation();

  const rawSegments = pathname.split('/').filter(Boolean);
  const segments = rawSegments.filter((seg) => !isId(seg));

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
                className="w-3.5 h-3.5 text-blue-200 flex-shrink-0"
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
                className="font-semibold text-white text-base tracking-tight truncate max-w-[180px]"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-blue-100 hover:text-white transition-colors truncate max-w-[120px]"
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
