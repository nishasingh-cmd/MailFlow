import { useState, useEffect, useCallback } from 'react';
import { LeadResearchResult, ResearchStatus, ResearchSource } from '@mailflow/shared';
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
    <h4 className="text-xs font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
      {children}
    </h4>
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
  if (!items?.length) return <p className="text-sm text-black/60 italic">None identified</p>;
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5"
            aria-hidden="true"
          />
          <span className="text-black leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PainPointIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
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
      className="w-4 h-4 text-green-600 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  const upper = confidence.toUpperCase();
  const colors: Record<string, string> = {
    HIGH: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    MEDIUM: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    LOW: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        colors[upper] || colors.MEDIUM
      }`}
    >
      {upper} CONFIDENCE
    </span>
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
  const [researchData, setResearchData] = useState<LeadResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch lead-isolated research data
  const fetchResearch = useCallback(async (targetLeadId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await researchService.getResearch(targetLeadId);
      setResearchData(data);
    } catch {
      setError('Failed to load research data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Strict per-lead isolation: reset state immediately when target changes
  useEffect(() => {
    setResearchData(null);
    setError(null);

    if (isOpen && leadId) {
      fetchResearch(leadId);
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
      await fetchResearch(leadId);
      onResearchComplete?.();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error ?? 'Research failed. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const status =
    (researchData?.status ?? (researchData?.research?.status as ResearchStatus)) || 'PENDING';
  const hasResearch = status === 'COMPLETED';
  const research = researchData?.research;
  const company = researchData?.company;

  const resolvedCompanyName =
    researchData?.companyName ||
    research?.companyNameAtResearchTime ||
    company?.name ||
    companyName ||
    'Unknown Company';

  const resolvedWebsite =
    researchData?.website ||
    research?.companyWebsite ||
    research?.companyDomain ||
    company?.website ||
    null;

  const resolvedIndustry =
    researchData?.industry || research?.industry || company?.industry || null;

  const productsServices = research?.productsServices || [
    ...(company?.products || []),
    ...(company?.services || []),
  ];

  const painPoints = research?.painPoints || [];
  const opportunities = research?.opportunities || [];
  const personalizationInsights: string[] = Array.isArray(research?.personalizationInsights)
    ? research.personalizationInsights
    : research?.personalizationInsights
      ? [research.personalizationInsights]
      : [];

  const rawSources = researchData?.sources || (research?.sources as ResearchSource[]) || [];
  const sources: ResearchSource[] = (Array.isArray(rawSources) ? rawSources : []).filter(
    (s: unknown): s is ResearchSource =>
      Boolean(s && typeof s === 'object' && ('url' in s || 'name' in s))
  );

  const badgeStatus: ResearchStatus | null =
    status === 'COMPLETED' || status === 'PROCESSING' || status === 'PENDING'
      ? status
      : status
        ? 'FAILED'
        : null;

  return (
    <Drawer open={isOpen} onClose={onClose} title="Company Research" width="w-[520px]">
      <div className="space-y-5">
        {/* Header with Lead & Company Isolation Details */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-brand-600 font-bold text-xl">
                {resolvedCompanyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[var(--content-primary)] leading-tight truncate">
                {resolvedCompanyName}
              </h3>
              {researchData?.leadName && (
                <p className="text-xs text-[var(--content-secondary)] truncate">
                  Lead:{' '}
                  <span className="font-medium text-[var(--content-primary)]">
                    {researchData.leadName}
                  </span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {resolvedWebsite && (
                  <a
                    href={
                      resolvedWebsite.startsWith('http')
                        ? resolvedWebsite
                        : `https://${resolvedWebsite}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-600 hover:underline truncate max-w-[200px]"
                  >
                    {resolvedWebsite}
                  </a>
                )}
                {resolvedIndustry && (
                  <Badge variant="brand" size="sm">
                    {resolvedIndustry}
                  </Badge>
                )}
                <ConfidenceBadge confidence={researchData?.confidence || research?.confidence} />
              </div>
            </div>
          </div>
          <ResearchStatusBadge status={badgeStatus} className="shrink-0" />
        </div>

        {/* Loading shimmer */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg shimmer" />
            ))}
          </div>
        )}

        {/* Error notification */}
        {error && !isLoading && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Empty state / Not researched */}
        {!isLoading && !hasResearch && (
          <Card variant="elevated" className="p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 mx-auto flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand-500"
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
                {status === 'FAILED' ? 'Research Failed' : 'No Research Yet'}
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-1">
                {status === 'FAILED'
                  ? research?.errorMessage ||
                    researchData?.error ||
                    'An error occurred during research. You can retry.'
                  : 'Click below to run genuine, evidence-based AI research for this lead.'}
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
              ) : status === 'FAILED' ? (
                'Retry Research'
              ) : (
                'Research Company'
              )}
            </Button>
          </Card>
        )}

        {/* AI Company Summary */}
        {hasResearch && (research?.summary || research?.companyDescription) && (
          <Card
            variant="elevated"
            className="p-4 space-y-2 border border-slate-300 dark:border-slate-700 bg-[var(--surface-card)]"
          >
            <SectionHeading>Company Summary & Mission</SectionHeading>
            <p className="text-sm text-black font-medium leading-relaxed">
              {research.summary || research.companyDescription}
            </p>
            {research.lastResearched && (
              <p className="text-xs text-black/60 pt-1">
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

        {/* Key Products & Services */}
        {hasResearch && productsServices.length > 0 && (
          <Card
            variant="default"
            className="p-4 space-y-2 border border-slate-300 dark:border-slate-700"
          >
            <SectionHeading>Core Products & Services</SectionHeading>
            <PointerList items={productsServices} />
          </Card>
        )}

        {/* Company Profile Details */}
        {hasResearch && (
          <Card
            variant="default"
            className="p-4 space-y-3 border border-slate-300 dark:border-slate-700"
          >
            <SectionHeading>Company Profile</SectionHeading>
            <InfoRow label="Headquarters" value={research?.location || company?.headquarters} />
            <InfoRow label="Company Size" value={research?.companySize || company?.companySize} />
            <InfoRow
              label="Target Audience"
              value={research?.targetAudience || company?.targetCustomers}
            />
            <InfoRow label="Domain" value={research?.companyDomain} />
          </Card>
        )}

        {/* Likely Pain Points */}
        {hasResearch && painPoints.length > 0 && (
          <Card
            variant="default"
            className="p-4 space-y-2 border border-slate-300 dark:border-slate-700"
          >
            <SectionHeading>Likely Pain Points</SectionHeading>
            <ul className="space-y-2">
              {painPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
                  <PainPointIcon />
                  <span className="text-black leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Outreach Opportunities */}
        {hasResearch && opportunities.length > 0 && (
          <Card
            variant="default"
            className="p-4 space-y-2 border border-slate-300 dark:border-slate-700"
          >
            <SectionHeading>Outreach Angles & Opportunities</SectionHeading>
            <ul className="space-y-2">
              {opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-black font-medium">
                  <OpportunityIcon />
                  <span className="text-black leading-snug">{opp}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Personalization Insights */}
        {hasResearch && personalizationInsights.length > 0 && (
          <Card
            variant="default"
            className="p-4 space-y-2 border border-slate-300 dark:border-slate-700"
          >
            <SectionHeading>Personalization Angles</SectionHeading>
            <PointerList items={personalizationInsights} />
          </Card>
        )}

        {/* Verified Sources & Audit Trail */}
        {hasResearch && sources.length > 0 && (
          <Card
            variant="default"
            className="p-4 space-y-2 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <SectionHeading>Verified Sources</SectionHeading>
            <div className="space-y-1.5">
              {sources.map((src, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <a
                    href={src.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline truncate max-w-[280px]"
                    title={src.name || src.url || 'Source'}
                  >
                    {src.name || src.url || 'Official Source'}
                  </a>
                  <span className="text-[10px] text-black/60 uppercase font-mono">
                    {src.type || 'web'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {hasResearch && (
          <div className="space-y-2 pt-2">
            {onGenerateEmail && leadId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onGenerateEmail(leadId, resolvedCompanyName);
                }}
                className="w-full shadow-lg shadow-brand-500/20 font-semibold"
              >
                Generate AI Email for {resolvedCompanyName}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleResearch}
              disabled={isResearching}
              className="w-full text-xs"
            >
              {isResearching ? 'Re-researching...' : 'Refresh Research (Force Live Update)'}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
