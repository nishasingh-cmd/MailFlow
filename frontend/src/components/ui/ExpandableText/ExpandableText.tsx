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
  text,
  limit = 60,
  className,
  textClassName,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;
  const displayText = isLong && !expanded ? `${text.slice(0, limit)}...` : text;

  return (
    /* w-full + min-w-0 + overflow-hidden: guarantees this div never drives
       its parent column wider — the cardinal rule for stable table layout. */
    <div className={cn('w-full min-w-0 overflow-hidden', className)}>
      {/* break-words + whitespace-normal: long words / URLs wrap rather than overflow */}
      <span className={cn('text-xs leading-relaxed break-words whitespace-normal', textClassName)}>
        {displayText}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          /* inline so it flows with text; no nowrap so it wraps if needed */
          className="ml-1 text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded cursor-pointer"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse text' : 'Expand text'}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default ExpandableText;
