import { Card, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';

export default function Analytics() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-[var(--content-secondary)] font-normal">
            Track deliverability, open rates, and reply performance metrics.
          </p>
        </div>
      </div>

      <Card variant="default">
        <EmptyState
          title="Analytics dashboard"
          description="Detailed performance charts and delivery metrics will be available once campaign data is accumulated."
          action={{
            label: 'Refresh Data',
            onClick: () => toast.info('Analytics reports coming soon'),
          }}
        />
      </Card>
    </div>
  );
}
