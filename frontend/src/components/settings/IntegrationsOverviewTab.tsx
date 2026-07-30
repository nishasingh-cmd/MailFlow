import { IntegrationCardData } from '@mailflow/shared';
import { Badge, Button } from '../ui';

interface IntegrationsOverviewTabProps {
  integrations: IntegrationCardData[];
  onNavigateTab: (tabId: string) => void;
}

function formatLastTested(dateStr?: string | null) {
  if (!dateStr) return 'Never tested';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IntegrationsOverviewTab({
  integrations,
  onNavigateTab,
}: IntegrationsOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--content-primary)]">
          Connected Integrations Overview
        </h3>
        <p className="text-xs text-[var(--content-secondary)] mt-0.5">
          View connection statuses, last verification timestamps, and manage API infrastructure
          credentials.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => {
          let badgeVariant: 'success' | 'warning' | 'neutral' | 'error' = 'neutral';
          let badgeLabel: string = item.status;

          if (item.status === 'CONNECTED') {
            badgeVariant = 'success';
            badgeLabel = 'Connected';
          } else if (item.status === 'MOCK_ACTIVE') {
            badgeVariant = 'warning';
            badgeLabel = 'Mock Provider Active';
          } else if (item.status === 'NEEDS_ATTENTION') {
            badgeVariant = 'error';
            badgeLabel = 'Needs Attention';
          } else {
            badgeVariant = 'neutral';
            badgeLabel = 'Disconnected';
          }

          let targetTab = 'email';
          if (item.category === 'AI') targetTab = 'ai';
          else if (item.category === 'WHATSAPP') targetTab = 'whatsapp';

          return (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 flex flex-col justify-between space-y-4 shadow-elevation-1 hover:border-[var(--content-tertiary)] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-brand-400 font-bold text-lg">
                    {item.category === 'AI' ? '✨' : item.category === 'WHATSAPP' ? '💬' : '✉️'}
                  </div>
                  <Badge variant={badgeVariant} size="sm" dot>
                    {badgeLabel}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[var(--content-primary)]">
                    {item.name}
                  </h4>
                  <p className="text-xs text-[var(--content-secondary)] mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between text-2xs text-[var(--content-tertiary)]">
                <span>Tested: {formatLastTested(item.lastTestedAt)}</span>
                <Button variant="ghost" size="sm" onClick={() => onNavigateTab(targetTab)}>
                  Configure →
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
