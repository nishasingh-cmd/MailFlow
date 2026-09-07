import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Campaign } from '@mailflow/shared';
import { useNavigate } from 'react-router-dom';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { Skeleton } from '../ui';
import { useClickOutside } from '../../hooks/useClickOutside';
import { cn } from '../../utils/cn';

interface CampaignTableProps {
  campaigns: Campaign[];
  loading?: boolean;
  onEdit: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
  onDuplicate: (c: Campaign) => void;
  onSend?: (c: Campaign) => void;
}

function ActionMenu({
  campaign,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onSend,
}: {
  campaign: Campaign;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSend?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false));

  const MENU_HEIGHT = 210; // approximate dropdown height in px

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < MENU_HEIGHT
          ? rect.top + window.scrollY - MENU_HEIGHT - 4 // open upward
          : rect.bottom + window.scrollY + 4; // open downward
      setMenuPos({
        top,
        left: rect.right + window.scrollX - 160, // right-align to button
      });
    }
    setOpen((o) => !o);
  };

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [open]);

  const items = [
    { label: 'View', icon: '👁', action: onView },
    ...(onSend
      ? [
          {
            label: campaign.status === 'SENDING' ? 'Progress' : 'Send',
            icon: '🚀',
            action: onSend,
          },
        ]
      : []),
    { label: 'Edit', icon: '✏️', action: onEdit },
    { label: 'Duplicate', icon: '📋', action: onDuplicate },
    { label: 'Delete', icon: '🗑', action: onDelete, danger: true },
  ];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        id={`campaign-actions-${campaign.id}`}
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-[var(--content-tertiary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
        aria-label="Campaign actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
            className="w-40 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] shadow-elevation-2 animate-slide-up overflow-hidden"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.action();
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors',
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-[var(--content-primary)] hover:bg-[var(--surface-hover)]'
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CampaignTable({
  campaigns,
  loading,
  onEdit,
  onDelete,
  onDuplicate,
  onSend,
}: CampaignTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-elevated)]">
            <tr>
              {['Campaign Name', 'Created', 'Leads', 'Template', 'Status', 'Updated', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton variant="text" className="w-full h-3" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-elevated)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                Campaign Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                Leads
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell">
                Template
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden lg:table-cell">
                Updated
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="hover:bg-[var(--surface-elevated)] transition-colors group"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    className="text-left"
                  >
                    <p className="font-semibold text-[var(--content-primary)] group-hover:text-brand-400 transition-colors">
                      {campaign.name}
                    </p>
                    {campaign.description && (
                      <p className="text-xs text-[var(--content-tertiary)] truncate max-w-[200px] mt-0.5">
                        {campaign.description}
                      </p>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-[var(--content-secondary)] hidden sm:table-cell">
                  {formatDate(campaign.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-[var(--content-primary)]">
                    {campaign._count?.campaignLeads ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--content-secondary)] hidden md:table-cell">
                  <span className="text-[var(--content-tertiary)]">—</span>
                </td>
                <td className="px-4 py-3">
                  <CampaignStatusBadge status={campaign.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-[var(--content-secondary)] hidden lg:table-cell">
                  {formatDate(campaign.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <ActionMenu
                    campaign={campaign}
                    onView={() => navigate(`/campaigns/${campaign.id}`)}
                    onEdit={() => onEdit(campaign)}
                    onDelete={() => onDelete(campaign)}
                    onDuplicate={() => onDuplicate(campaign)}
                    onSend={onSend ? () => onSend(campaign) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
