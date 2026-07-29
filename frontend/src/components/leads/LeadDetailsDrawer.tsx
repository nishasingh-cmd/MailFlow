import { Lead, ImportHistory } from '@mailflow/shared';
import { Drawer, Badge, Button, Card } from '../ui';

interface LeadDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: (Lead & { importHistory?: ImportHistory | null }) | null;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function LeadDetailsDrawer({
  isOpen,
  onClose,
  lead,
  onEdit,
  onDelete,
}: LeadDetailsDrawerProps) {
  if (!lead) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="info">New</Badge>;
      case 'CONTACTED':
        return <Badge variant="warning">Contacted</Badge>;
      case 'QUALIFIED':
        return <Badge variant="success">Qualified</Badge>;
      case 'UNSUBSCRIBED':
        return <Badge variant="neutral">Unsubscribed</Badge>;
      case 'BOUNCED':
        return <Badge variant="error">Bounced</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Drawer open={isOpen} onClose={onClose} title="Lead Profile" width="w-96">
      <div className="space-y-6">
        {/* Lead Header Profile Card */}
        <div className="flex items-start justify-between border-b border-[var(--surface-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 font-bold text-lg flex items-center justify-center">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--content-primary)]">{lead.name}</h3>
              <p className="text-sm text-[var(--content-secondary)]">{lead.email}</p>
            </div>
          </div>
          <div>{getStatusBadge(lead.status)}</div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-1/2"
            onClick={() => {
              onClose();
              onEdit(lead);
            }}
          >
            Edit Lead
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="w-1/2"
            onClick={() => {
              onClose();
              onDelete(lead);
            }}
          >
            Delete Lead
          </Button>
        </div>

        {/* Contact Information */}
        <Card variant="default" className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
            Contact Information
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Email:</span>
              <a href={`mailto:${lead.email}`} className="text-brand-400 hover:underline">
                {lead.email}
              </a>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Phone:</span>
              <span className="text-[var(--content-primary)] font-mono">
                {lead.phone || (
                  <span className="text-[var(--content-tertiary)] italic">Not set</span>
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">LinkedIn:</span>
              {lead.linkedin ? (
                <a
                  href={
                    lead.linkedin.startsWith('http') ? lead.linkedin : `https://${lead.linkedin}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline truncate max-w-[200px]"
                >
                  {lead.linkedin}
                </a>
              ) : (
                <span className="text-[var(--content-tertiary)] italic">Not set</span>
              )}
            </div>
          </div>
        </Card>

        {/* Company & Industry Information */}
        <Card variant="default" className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
            Company & Industry
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Company:</span>
              <span className="text-[var(--content-primary)] font-medium">
                {lead.company || (
                  <span className="text-[var(--content-tertiary)] italic">Not specified</span>
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Industry:</span>
              <span className="text-[var(--content-primary)]">
                {lead.industry || (
                  <span className="text-[var(--content-tertiary)] italic">Not specified</span>
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Website:</span>
              {lead.website ? (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline truncate max-w-[200px]"
                >
                  {lead.website}
                </a>
              ) : (
                <span className="text-[var(--content-tertiary)] italic">Not specified</span>
              )}
            </div>
          </div>
        </Card>

        {/* Import Source & System Metadata */}
        <Card variant="default" className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
            System Metadata
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Import Source:</span>
              <span className="text-[var(--content-primary)] font-medium">
                {lead.importHistory ? lead.importHistory.fileName : 'Manual Entry'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Created Date:</span>
              <span className="text-[var(--content-primary)]">
                {new Date(lead.createdAt).toLocaleDateString()}{' '}
                {new Date(lead.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--content-secondary)]">Last Updated:</span>
              <span className="text-[var(--content-primary)]">
                {new Date(lead.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Drawer>
  );
}
