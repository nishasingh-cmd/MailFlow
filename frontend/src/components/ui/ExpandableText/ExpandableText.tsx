import { useState } from 'react';
import { cn } from '../../../utils/cn';

export interface ExpandableTextProps {
  /** The full text to display */
  text: string;
  /** Number of characters to show before truncating. Default 60. */
  limit?: number;
  /** Extra class names for the wrapper div */
  className?: string;
  /** Text class names */
  textClassName?: string;
}

/**
 * ExpandableText — stable-width read-more/read-less component.
 *
 * IMPORTANT: The wrapper intentionally uses `w-full min-w-0 overflow-hidden`
 * so it can NEVER push its containing column wider. All text wraps inside the
 * existing column width. Only the visible row height changes on expand/collapse.
 */
export function ExpandableText({
  text = '',
  limit = 60,
  className,
  textClassName,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const safeText = text || '';
  const isLong = safeText.length > limit;

  if (!expanded) {
    return (
      <div className={cn('flex items-center gap-1.5 w-full min-w-0', className)}>
        <span className={cn('text-xs truncate min-w-0 flex-1', textClassName)} title={safeText}>
          {safeText}
        </span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded cursor-pointer"
            aria-expanded={false}
            aria-label="Expand text"
          >
            Read more
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full min-w-0 overflow-hidden', className)}>
      <span className={cn('text-xs leading-relaxed break-words whitespace-normal', textClassName)}>
        {safeText}
      </span>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="ml-1.5 inline text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded cursor-pointer whitespace-nowrap"
        aria-expanded={true}
        aria-label="Collapse text"
      >
        Read less
      </button>
    </div>
  );
}

export default ExpandableText;
