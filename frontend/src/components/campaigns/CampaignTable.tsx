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

  const items: Array<{
    label: string;
    icon: React.ReactNode;
    action: () => void;
    danger?: boolean;
  }> = [
    {
      label: 'View',
      icon: (
        <svg
          className="w-4 h-4 text-[var(--content-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
      action: onView,
    },
    ...(onSend
      ? [
          {
            label: campaign.status === 'SENDING' ? 'Progress' : 'Send',
            icon: (
              <svg
                className="w-4 h-4 text-[var(--content-tertiary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            ),
            action: onSend,
          },
        ]
      : []),
    {
      label: 'Edit',
      icon: (
        <svg
          className="w-4 h-4 text-[var(--content-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      action: onEdit,
    },
    {
      label: 'Duplicate',
      icon: (
        <svg
          className="w-4 h-4 text-[var(--content-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      action: onDuplicate,
    },
    {
      label: 'Delete',
      icon: (
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      action: onDelete,
      danger: true,
    },
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

function formatTemplateName(str?: string | null) {
  if (!str) return 'Cold Outreach';
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
              {[
                'Campaign Name',
                'Channel',
                'Created',
                'Leads',
                'Template',
                'Status',
                'Updated',
                '',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
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
            <tr className="h-14">
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider align-middle">
                Campaign Name
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider align-middle">
                Channel
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden sm:table-cell align-middle">
                Created
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider align-middle">
                Leads
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden md:table-cell align-middle">
                Template
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider align-middle">
                Status
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider hidden lg:table-cell align-middle">
                Updated
              </th>
              <th className="px-5 py-4 w-10 align-middle"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="h-14 hover:bg-[var(--surface-elevated)] transition-colors group"
              >
                <td className="px-5 py-4 align-middle">
                  <button
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    className="text-left"
                  >
                    <p className="font-semibold text-[var(--content-primary)] group-hover:text-brand-400 transition-colors">
                      {campaign.name}
                    </p>
                    {campaign.description && (
                      <p className="text-xs text-[var(--content-tertiary)] truncate max-w-[220px] mt-0.5">
                        {campaign.description}
                      </p>
                    )}
                  </button>
                </td>
                <td className="px-5 py-4 align-middle">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {campaign.channel === 'WHATSAPP'
                      ? 'WhatsApp'
                      : campaign.channel === 'EMAIL_AND_WHATSAPP'
                        ? 'Multi-Channel'
                        : 'Email'}
                  </span>
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
                  <span className="text-xs text-[var(--content-primary)] font-medium">
                    {formatTemplateName(campaign.templateId)}
                  </span>
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
