import { Card, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';

export default function Settings() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[var(--content-secondary)]">
            Manage your workspace, team members, and API credentials.
          </p>
        </div>
      </div>

      <Card variant="default">
        <EmptyState
          title="Account &amp; Workspace Settings"
          description="Configure domain sending limits, team permissions, and webhooks."
          action={{
            label: 'Save Configuration',
            onClick: () => toast.info('Settings settings panel coming soon'),
          }}
        />
      </Card>
    </div>
  );
}
