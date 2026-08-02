import { Button } from '../ui';

interface BulkResearchBarProps {
  selectedCount: number;
  onResearchSelected: () => void;
  onSendEmailSelected?: () => void;
  onClear: () => void;
  isResearching: boolean;
}

export function BulkResearchBar({
  selectedCount,
  onResearchSelected,
  onSendEmailSelected,
  onClear,
  isResearching,
}: BulkResearchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-between gap-4 text-sm animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        <span className="text-[var(--content-primary)] font-medium">
          {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onSendEmailSelected && (
          <Button
            size="sm"
            variant="primary"
            onClick={onSendEmailSelected}
            disabled={isResearching}
          >
            ✉️ Send Email ({selectedCount})
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={onResearchSelected} disabled={isResearching}>
          {isResearching ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Researching...
            </span>
          ) : (
            `🔍 Research Selected (${selectedCount})`
          )}
        </Button>

        <button
          onClick={onClear}
          className="text-xs text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] transition-colors ml-1"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
