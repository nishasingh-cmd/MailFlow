import { CampaignStatus } from '@mailflow/shared';
import { Badge, type BadgeVariant } from '../ui';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; variant: BadgeVariant; dot: boolean }
> = {
  DRAFT: { label: 'Draft', variant: 'neutral', dot: true },
  READY: { label: 'Ready', variant: 'info', dot: true },
  COMPLETED: { label: 'Completed', variant: 'success', dot: true },
};

export function CampaignStatusBadge({ status, size = 'md' }: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
