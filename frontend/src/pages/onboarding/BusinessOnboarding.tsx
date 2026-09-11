import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Select, Card } from '../../components/ui';
import {
  businessProfileService,
  CreateBusinessProfileDto,
} from '../../services/business-profile.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../routes/routes';

const INDUSTRY_OPTIONS = [
  { value: 'SaaS & Software', label: 'SaaS & Software' },
  { value: 'Marketing & Advertising', label: 'Marketing & Advertising' },
  { value: 'Healthcare & Medical', label: 'Healthcare & Medical' },
  { value: 'Financial Services & Fintech', label: 'Financial Services & Fintech' },
  { value: 'E-Commerce & Retail', label: 'E-Commerce & Retail' },
  { value: 'Real Estate & Construction', label: 'Real Estate & Construction' },
  { value: 'Professional & Business Services', label: 'Professional & Business Services' },
  { value: 'Education & EdTech', label: 'Education & EdTech' },
  { value: 'Manufacturing & Logistics', label: 'Manufacturing & Logistics' },
  { value: 'Other', label: 'Other' },
];

const COMPANY_SIZE_OPTIONS = [
  { value: '1-10 employees', label: '1–10 employees (Seed / Startup)' },
  { value: '11-50 employees', label: '11–50 employees (Early Stage)' },
  { value: '51-200 employees', label: '51–200 employees (Growth)' },
  { value: '201-500 employees', label: '201–500 employees (Mid-Market)' },
  { value: '500+ employees', label: '500+ employees (Enterprise)' },
];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser, logout } = useAuth();

  const [formData, setFormData] = useState<CreateBusinessProfileDto>({
    businessName: '',
    website: '',
    industry: '',
    location: '',
    companySize: '',
    businessDescription: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadExisting() {
      try {
        const profile = await businessProfileService.getProfile();
        if (profile && mounted) {
          setFormData({
            businessName: profile.businessName || '',
            website: profile.website || '',
            industry: profile.industry || '',
            location: profile.location || '',
            companySize: profile.companySize || '',
            businessDescription: profile.businessDescription || '',
          });
        }
      } catch {
        // Non-fatal, new onboarding
      }
    }
    loadExisting();
    return () => {
      mounted = false;
    };
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      errs.businessName = 'Business name is required.';
    }
    if (!formData.industry.trim()) {
      errs.industry = 'Industry is required.';
    }
    if (!formData.businessDescription.trim()) {
      errs.businessDescription = 'Business description is required.';
    }

    if (formData.website?.trim()) {
      const urlStr = formData.website.trim();
      const hasProtocol = /^https?:\/\//i.test(urlStr);
      const toTest = hasProtocol ? urlStr : `https://${urlStr}`;
      try {
        new URL(toTest);
      } catch {
        errs.website = 'Please enter a valid website URL.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      toast.error('Please complete all required fields highlighted in red.');
      return;
    }

    setSubmitting(true);
    try {
      await businessProfileService.createProfile(formData);
      toast.success('Your business profile is ready.');
      // Refresh user context so hasBusinessProfile updates to true
      await refreshUser();
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string; details?: Record<string, string> } };
        message?: string;
      };
      const apiMsg = e.response?.data?.error || e.message || 'Failed to save business profile';
      const apiDetails = e.response?.data?.details;
      if (apiDetails) {
        setErrors(apiDetails);
      }
      setServerError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] text-[var(--content-primary)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top bar with logo and logout */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-brand flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-[var(--content-primary)] tracking-tight">
                MailFlow
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                Setup
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            Sign out
          </Button>
        </div>

        {/* Progress Stepper */}
        <div className="bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-2xl p-5 shadow-elevation-1 max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-glow-brand flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-brand-600 dark:text-brand-400 font-bold">
                  Step 1
                </p>
                <p className="text-xs sm:text-sm font-semibold text-[var(--content-primary)]">
                  Business Profile
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-60">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--content-tertiary)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-[var(--content-tertiary)] font-bold">
                  Step 2
                </p>
                <p className="text-xs sm:text-sm font-medium text-[var(--content-secondary)]">
                  Start Using MailFlow
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero title */}
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--content-primary)] sm:text-4xl">
            Let's set up your business
          </h1>
          <p className="text-sm sm:text-base text-[var(--content-secondary)] leading-relaxed">
            Tell us about your company and offering. MailFlow's AI uses this profile to generate
            personalized outreach emails and WhatsApp messages that convert.
          </p>
        </div>

        {serverError && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-200">Unable to save profile</p>
              <p className="text-xs text-red-300/90 mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION A: Business Basics */}
          <Card variant="elevated" padding="lg" className="space-y-6">
            <div className="pb-4 border-b border-[var(--surface-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--content-primary)]">
                  Section A — Business Basics
                </h2>
                <p className="text-xs text-[var(--content-tertiary)]">
                  General information about your company
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => {
                    setFormData({ ...formData, businessName: e.target.value });
                    if (errors.businessName) setErrors({ ...errors, businessName: '' });
                  }}
                  placeholder="e.g. Apex Growth Solutions"
                  error={errors.businessName}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                  Website
                </label>
                <Input
                  value={formData.website || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, website: e.target.value });
                    if (errors.website) setErrors({ ...errors, website: '' });
                  }}
                  placeholder="https://yourcompany.com"
                  error={errors.website}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                  Industry <span className="text-red-400">*</span>
                </label>
                <Select
                  value={formData.industry}
                  onChange={(val) => {
                    setFormData({ ...formData, industry: val });
                    if (errors.industry) setErrors({ ...errors, industry: '' });
                  }}
                  options={INDUSTRY_OPTIONS}
                  placeholder="Select industry"
                  error={errors.industry}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                  Location / Headquarters
                </label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA or London, UK"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1.5">
                  Company Size
                </label>
                <Select
                  value={formData.companySize || ''}
                  onChange={(val) => setFormData({ ...formData, companySize: val })}
                  options={COMPANY_SIZE_OPTIONS}
                  placeholder="Select company size"
                />
              </div>
            </div>
          </Card>

          {/* SECTION B: What Your Business Does */}
          <Card variant="elevated" padding="lg" className="space-y-6">
            <div className="pb-4 border-b border-[var(--surface-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--content-primary)]">
                  Section B — What Your Business Does
                </h2>
                <p className="text-xs text-[var(--content-tertiary)]">
                  Help AI understand your offering and value proposition
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--content-secondary)]">
                    Business Description <span className="text-red-400">*</span>
                  </label>
                  <span className="text-2xs text-[var(--content-tertiary)]">
                    What does your company do?
                  </span>
                </div>
                <Textarea
                  value={formData.businessDescription}
                  onChange={(e) => {
                    setFormData({ ...formData, businessDescription: e.target.value });
                    if (errors.businessDescription)
                      setErrors({ ...errors, businessDescription: '' });
                  }}
                  placeholder="Describe your business in 2-3 sentences. E.g. We provide enterprise-grade outbound infrastructure and AI email generation for fast-growing sales teams."
                  rows={3}
                  error={errors.businessDescription}
                />
              </div>
            </div>
          </Card>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--surface-border)]">
            <p className="text-xs text-[var(--content-tertiary)]">
              You can update your business profile anytime in{' '}
              <span className="font-semibold text-[var(--content-secondary)]">
                Settings → Business Profile
              </span>
              .
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting}
              className="px-8"
              rightIcon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              }
            >
              {submitting ? 'Setting up MailFlow…' : 'Start Using MailFlow →'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
