import { Card, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';

export default function Campaigns() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-[var(--content-secondary)]">
            Create, launch, and monitor automated email sequences.
          </p>
        </div>
      </div>

      <Card variant="default">
        <EmptyState
          title="No campaigns created"
          description="Build multi-step automated email campaigns with custom personalization tags."
          action={{
            label: 'Create Campaign',
            onClick: () => toast.info('Campaign builder coming in next phase'),
          }}
        />
      </Card>
    </div>
  );
}
