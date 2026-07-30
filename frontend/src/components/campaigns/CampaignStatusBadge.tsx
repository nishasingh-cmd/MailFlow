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
  SENDING: { label: 'Sending...', variant: 'brand', dot: true },
  PAUSED: { label: 'Paused', variant: 'warning', dot: true },
  SENT: { label: 'Sent', variant: 'success', dot: true },
  COMPLETED: { label: 'Completed', variant: 'success', dot: true },
  FAILED: { label: 'Failed', variant: 'error', dot: true },
};

export function CampaignStatusBadge({ status, size = 'md' }: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'neutral', dot: true };
  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
