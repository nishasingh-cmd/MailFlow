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
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-brand-400">
                    {item.category === 'AI' ? (
                      <svg
                        className="w-5 h-5 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    ) : item.category === 'WHATSAPP' ? (
                      <svg
                        className="w-5 h-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-brand-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
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
