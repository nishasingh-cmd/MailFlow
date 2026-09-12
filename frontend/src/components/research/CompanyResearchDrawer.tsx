import { useState, useEffect, useCallback } from 'react';
import { Company, ResearchStatus } from '@mailflow/shared';
import { researchService } from '../../services/research.service';
import { Drawer, Button, Card, Badge } from '../ui';
import { ResearchStatusBadge } from './ResearchStatusBadge';

interface CompanyResearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  companyName?: string | null;
  onResearchComplete?: () => void;
  onGenerateEmail?: (leadId: string, companyName?: string) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold text-black uppercase tracking-widest mb-2">{children}</h4>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 text-sm py-1.5 border-b border-[var(--surface-border)] last:border-0">
      <span className="text-black shrink-0 w-32 font-medium">{label}</span>
      <span className="text-black text-right font-medium">{value}</span>
    </div>
  );
}

function PointerList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-sm text-black italic">None identified</p>;
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0 mt-1.5" aria-hidden="true" />
          <span className="text-black leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PainPointIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function CompanyResearchDrawer({
  isOpen,
  onClose,
  leadId,
  companyName,
  onResearchComplete,
  onGenerateEmail,
}: CompanyResearchDrawerProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResearch = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await researchService.getResearch(leadId);
      setCompany(data);
    } catch {
      setError('Failed to load research data');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchResearch();
    } else {
      setCompany(null);
      setError(null);
    }
  }, [isOpen, leadId, fetchResearch]);

  const handleResearch = async () => {
    if (!leadId) return;
    setIsResearching(true);
    setError(null);
    try {
      const res = await researchService.researchSingle(leadId);
      if (res.status === 'FAILED') {
        setError(res.error ?? 'Research failed for this company.');
      }
      await fetchResearch();
      onResearchComplete?.();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error ?? 'Research failed. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const researchStatus = company?.research?.status as ResearchStatus | undefined;
  const hasResearch = researchStatus === 'COMPLETED';
  const research = company?.research;

  return (
    <Drawer open={isOpen} onClose={onClose} title="Company Research" width="w-[480px]">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-bold text-xl">
                {(company?.name ?? companyName ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--content-primary)] leading-tight">
                {company?.name ?? companyName ?? 'Unknown Company'}
              </h3>
              {company?.website && (
                <a
                  href={
                    company.website.startsWith('http')
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline"
                >
                  {company.website}
                </a>
              )}
              {company?.industry && (
                <div className="mt-1">
                  <Badge variant="brand" size="sm">
                    {company.industry}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <ResearchStatusBadge status={researchStatus ?? null} className="shrink-0" />
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg shimmer" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {!isLoading && !hasResearch && (
          <Card variant="elevated" className="p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 mx-auto flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--content-primary)]">
                {researchStatus === 'FAILED' ? 'Research Failed' : 'No Research Yet'}
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-1">
                {researchStatus === 'FAILED'
                  ? (research?.errorMessage ?? 'An error occurred during research. You can retry.')
                  : 'Click below to run AI company research for this lead.'}
              </p>
            </div>
            <Button onClick={handleResearch} disabled={isResearching} className="w-full">
              {isResearching ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Researching...
                </span>
              ) : researchStatus === 'FAILED' ? (
                'Retry Research'
              ) : (
                'Research Company'
              )}
            </Button>
          </Card>
        )}

        {hasResearch && research?.summary && (
          <Card
            variant="elevated"
            className="p-4 space-y-2 border border-[var(--surface-border)] bg-[var(--surface-card)]"
          >
            <SectionHeading>AI Company Summary</SectionHeading>
            <p className="text-sm text-black font-medium leading-relaxed">{research.summary}</p>
            {research.lastResearched && (
              <p className="text-xs text-black/70">
                Last updated:{' '}
                {new Date(research.lastResearched).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </Card>
        )}

        {hasResearch && (research?.painPoints as string[] | null)?.length ? (
          <Card variant="default" className="p-4 space-y-2">
            <SectionHeading>Likely Pain Points</SectionHeading>
            <ul className="space-y-2">
              {(research?.painPoints as string[]).map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
                  <PainPointIcon />
                  <span className="text-black leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {hasResearch && (research?.opportunities as string[] | null)?.length ? (
          <Card variant="default" className="p-4 space-y-2">
            <SectionHeading>Outreach Opportunities</SectionHeading>
            <ul className="space-y-2">
              {(research?.opportunities as string[]).map((opp, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
                  <OpportunityIcon />
                  <span className="text-black leading-snug">{opp}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {hasResearch && company && (
          <Card variant="default" className="p-4 space-y-3">
            <SectionHeading>Company Details</SectionHeading>
            <InfoRow label="Headquarters" value={company.headquarters} />
            <InfoRow label="Company Size" value={company.companySize} />
            <InfoRow label="Target Customers" value={company.targetCustomers} />
            <InfoRow label="Description" value={company.description} />
          </Card>
        )}

        {hasResearch &&
          company &&
          (company.products?.length > 0 || company.services?.length > 0) && (
            <Card variant="default" className="p-4 space-y-4">
              {company.products?.length > 0 && (
                <div className="space-y-2">
                  <SectionHeading>Products</SectionHeading>
                  <PointerList items={company.products} />
                </div>
              )}
              {company.services?.length > 0 && (
                <div className="space-y-2">
                  <SectionHeading>Services</SectionHeading>
                  <PointerList items={company.services} />
                </div>
              )}
            </Card>
          )}

        {hasResearch && company && (company.techStack ?? []).length > 0 && (
          <Card variant="default" className="p-4 space-y-2">
            <SectionHeading>Technology Stack</SectionHeading>
            <PointerList items={company.techStack ?? []} />
          </Card>
        )}

        {hasResearch && (
          <div className="space-y-2 pt-2">
            {onGenerateEmail && leadId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onGenerateEmail(leadId, companyName || undefined);
                }}
                className="w-full shadow-lg shadow-brand-500/20 font-semibold"
              >
                Generate AI Email
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleResearch}
              disabled={isResearching}
              className="w-full text-xs"
            >
              {isResearching ? 'Re-researching...' : 'Refresh Research'}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
