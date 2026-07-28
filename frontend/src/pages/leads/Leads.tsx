import { Card, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';

export default function Leads() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">Leads</h1>
          <p className="text-sm text-[var(--content-secondary)]">
            Manage and segment your prospect leads list.
          </p>
        </div>
      </div>

      <Card variant="default">
        <EmptyState
          title="No leads added yet"
          description="Import your leads via CSV or connect your CRM integration to start reaching out."
          action={{
            label: 'Import CSV',
            onClick: () => toast.info('Lead CSV import feature coming in next phase'),
          }}
          secondaryAction={{
            label: 'Add Single Lead',
            onClick: () => toast.info('Single lead creation coming soon'),
            variant: 'outline',
          }}
        />
      </Card>
    </div>
  );
}
