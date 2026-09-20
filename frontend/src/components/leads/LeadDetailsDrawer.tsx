import { Lead, ImportHistory } from '@mailflow/shared';
import { Drawer, Badge, Button, Card } from '../ui';

interface LeadDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: (Lead & { importHistory?: ImportHistory | null }) | null;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onGenerateEmail?: (lead: Lead) => void;
}

export function LeadDetailsDrawer({
  isOpen,
  onClose,
  lead,
  onEdit,
  onDelete,
  onGenerateEmail,
}: LeadDetailsDrawerProps) {
  if (!lead) return null;

  const getStatusBadge = (status: string) => {
    if (status === 'CONTACTED' || status === 'QUALIFIED') {
      return <Badge variant="success">Contacted</Badge>;
    }
    return <Badge variant="neutral">Not Contacted</Badge>;
  };

  const isSyntheticEmail =
    lead.email.includes('@internal.mailflow') || lead.email.includes('@noemail.mailflow');

  const uploadedColList: string[] =
    lead.customFields &&
    typeof lead.customFields === 'object' &&
    Array.isArray((lead.customFields as Record<string, unknown>)._uploadedColumns)
      ? ((lead.customFields as Record<string, unknown>)._uploadedColumns as string[])
      : Object.keys(lead.customFields || {}).filter((k) => !k.startsWith('_'));

  const primaryTitle =
    uploadedColList.length > 0 &&
    lead.customFields &&
    (lead.customFields as Record<string, unknown>)[uploadedColList[0]]
      ? String((lead.customFields as Record<string, unknown>)[uploadedColList[0]])
      : lead.name;

  return (
    <Drawer open={isOpen} onClose={onClose} title="Lead Profile" width="w-96">
      <div className="space-y-6">
        <div className="flex items-start justify-between border-b border-[var(--surface-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 font-bold text-lg flex items-center justify-center shrink-0">
              {primaryTitle.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h3
                className="text-lg font-bold text-[var(--content-primary)] truncate"
                title={primaryTitle}
              >
                {primaryTitle}
              </h3>
              {!isSyntheticEmail ? (
                <p className="text-sm text-[var(--content-secondary)] truncate">{lead.email}</p>
              ) : (
                <p className="text-xs text-[var(--content-tertiary)] italic">
                  No email provided in file
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0">{getStatusBadge(lead.status)}</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {onGenerateEmail && !isSyntheticEmail && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onClose();
                onGenerateEmail(lead);
              }}
            >
              Email
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onClose();
              onEdit(lead);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onClose();
              onDelete(lead);
            }}
          >
            Delete
          </Button>
        </div>

        {uploadedColList.length > 0 && lead.customFields && (
          <Card variant="default" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
                Imported File Data
              </h4>
              <Badge variant="info" className="text-[10px]">
                {uploadedColList.length} Columns
              </Badge>
            </div>

            <div className="space-y-2.5 text-sm">
              {uploadedColList.map((key) => {
                const val = (lead.customFields as Record<string, unknown>)[key];
                return (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <span className="text-[var(--content-secondary)] text-xs font-medium shrink-0 pt-0.5">
                      {key}:
                    </span>
                    <span className="text-[var(--content-primary)] text-right text-xs break-words font-medium">
                      {val !== undefined && val !== null && String(val).trim() !== '' ? (
                        String(val)
                      ) : (
                        <span className="text-[var(--content-tertiary)] italic">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {(!uploadedColList || uploadedColList.length === 0) && (
          <Card variant="default" className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-[var(--content-tertiary)] uppercase tracking-wider">
              Contact Information
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--content-secondary)]">Email:</span>
                {!isSyntheticEmail ? (
                  <a href={`mailto:${lead.email}`} className="text-brand-400 hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-[var(--content-tertiary)] italic">Not set</span>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-[var(--content-secondary)]">Phone:</span>
                <span className="text-[var(--content-primary)] font-mono">
                  {lead.phone || (
                    <span className="text-[var(--content-tertiary)] italic">Not set</span>
                  )}
                </span>
              </div>
            </div>
          </Card>
        )}

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
