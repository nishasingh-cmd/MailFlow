import { useState, useEffect } from 'react';
import { Button, Input, Textarea, Select, Card, Badge, Skeleton } from '../ui';
import {
  businessProfileService,
  UpdateBusinessProfileDto,
} from '../../services/business-profile.service';
import { useToast } from '../../hooks/useToast';

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

const OUTREACH_GOALS = [
  { id: 'Generate Leads', label: 'Generate Leads', icon: '🎯' },
  { id: 'Book Meetings', label: 'Book Meetings', icon: '📅' },
  { id: 'Increase Sales', label: 'Increase Sales', icon: '📈' },
  { id: 'Promote Services', label: 'Promote Services', icon: '🚀' },
  { id: 'Build Partnerships', label: 'Build Partnerships', icon: '🤝' },
  { id: 'Recruit', label: 'Recruit Candidates', icon: '👥' },
  { id: 'Other', label: 'Other Objectives', icon: '✨' },
];

const TONE_OPTIONS = [
  { id: 'Professional', label: 'Professional', desc: 'Formal, authoritative, polished' },
  { id: 'Friendly', label: 'Friendly', desc: 'Warm, welcoming, supportive' },
  { id: 'Conversational', label: 'Conversational', desc: 'Natural, peer-to-peer dialogue' },
  { id: 'Persuasive', label: 'Persuasive', desc: 'Benefit-driven, compelling call to action' },
  { id: 'Direct', label: 'Direct', desc: 'Concise, high-impact, to the point' },
  { id: 'Casual', label: 'Casual', desc: 'Relaxed, modern, approachable' },
];

export function BusinessProfileTab() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateBusinessProfileDto>({
    businessName: '',
    website: '',
    industry: '',
    location: '',
    companySize: '',
    businessDescription: '',
    productsOrServices: '',
    valueProposition: '',
    targetAudience: '',
    idealCustomerProfile: '',
    outreachGoal: ['Generate Leads', 'Book Meetings'],
    toneOfVoice: 'Professional',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
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
            productsOrServices: profile.productsOrServices || '',
            valueProposition: profile.valueProposition || '',
            targetAudience: profile.targetAudience || '',
            idealCustomerProfile: profile.idealCustomerProfile || '',
            outreachGoal: profile.outreachGoal || ['Generate Leads'],
            toneOfVoice: profile.toneOfVoice || 'Professional',
          });
        }
      } catch {
        toast.error('Failed to load business profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const toggleGoal = (goal: string) => {
    const current = formData.outreachGoal || [];
    const exists = current.includes(goal);
    const next = exists ? current.filter((g) => g !== goal) : [...current, goal];
    setFormData({ ...formData, outreachGoal: next.length > 0 ? next : [goal] });
    if (errors.outreachGoal) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.outreachGoal;
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.businessName?.trim()) {
      errs.businessName = 'Business name is required.';
    }
    if (!formData.industry?.trim()) {
      errs.industry = 'Industry is required.';
    }
    if (!formData.businessDescription?.trim()) {
      errs.businessDescription = 'Business description is required.';
    }
    if (!formData.productsOrServices?.trim()) {
      errs.productsOrServices = 'Products or services are required.';
    }
    if (!formData.valueProposition?.trim()) {
      errs.valueProposition = 'Value proposition is required.';
    }
    if (!formData.targetAudience?.trim()) {
      errs.targetAudience = 'Target audience is required.';
    }
    if (!formData.idealCustomerProfile?.trim()) {
      errs.idealCustomerProfile = 'Ideal customer profile is required.';
    }
    if (!formData.outreachGoal || formData.outreachGoal.length === 0) {
      errs.outreachGoal = 'Please select at least one outreach goal.';
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

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      await businessProfileService.updateProfile(formData);
      toast.success('Business profile updated successfully!');
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string; details?: Record<string, string> } };
        message?: string;
      };
      const msg = e.response?.data?.error || e.message || 'Failed to update business profile.';
      if (e.response?.data?.details) {
        setErrors(e.response.data.details);
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="text" className="w-48 h-6" />
        <Skeleton variant="rect" className="w-full h-64 rounded-xl" />
        <Skeleton variant="rect" className="w-full h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--content-primary)]">Business Profile</h2>
          <p className="text-xs text-[var(--content-secondary)]">
            Manage your company information, target audience, and AI outreach context.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* SECTION A */}
      <Card variant="elevated" padding="md" className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
          <span className="text-base">🏢</span>
          <h3 className="text-sm font-bold text-[var(--content-primary)]">Business Basics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Business Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.businessName || ''}
              onChange={(e) => {
                setFormData({ ...formData, businessName: e.target.value });
                if (errors.businessName) setErrors({ ...errors, businessName: '' });
              }}
              placeholder="e.g. Apex Growth Solutions"
              error={errors.businessName}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
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
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Industry <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.industry || ''}
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
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Location / Headquarters
            </label>
            <Input
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
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

      {/* SECTION B */}
      <Card variant="elevated" padding="md" className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
          <span className="text-base">💼</span>
          <h3 className="text-sm font-bold text-[var(--content-primary)]">
            What Your Business Does
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Business Description <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={formData.businessDescription || ''}
              onChange={(e) => {
                setFormData({ ...formData, businessDescription: e.target.value });
                if (errors.businessDescription) setErrors({ ...errors, businessDescription: '' });
              }}
              rows={3}
              placeholder="Describe your company's core mission and activities"
              error={errors.businessDescription}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Products & Services <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={formData.productsOrServices || ''}
              onChange={(e) => {
                setFormData({ ...formData, productsOrServices: e.target.value });
                if (errors.productsOrServices) setErrors({ ...errors, productsOrServices: '' });
              }}
              rows={3}
              placeholder="Key products, software, or services offered"
              error={errors.productsOrServices}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Value Proposition <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={formData.valueProposition || ''}
              onChange={(e) => {
                setFormData({ ...formData, valueProposition: e.target.value });
                if (errors.valueProposition) setErrors({ ...errors, valueProposition: '' });
              }}
              rows={3}
              placeholder="Why prospects choose you over alternatives"
              error={errors.valueProposition}
            />
          </div>
        </div>
      </Card>

      {/* SECTION C */}
      <Card variant="elevated" padding="md" className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-bold text-[var(--content-primary)]">Your Ideal Customer</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Target Audience <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.targetAudience || ''}
              onChange={(e) => {
                setFormData({ ...formData, targetAudience: e.target.value });
                if (errors.targetAudience) setErrors({ ...errors, targetAudience: '' });
              }}
              placeholder="e.g. Sales Leaders, Founders, CMOs"
              error={errors.targetAudience}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--content-secondary)] mb-1">
              Ideal Customer Profile (ICP) <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={formData.idealCustomerProfile || ''}
              onChange={(e) => {
                setFormData({ ...formData, idealCustomerProfile: e.target.value });
                if (errors.idealCustomerProfile) setErrors({ ...errors, idealCustomerProfile: '' });
              }}
              rows={3}
              placeholder="Detailed criteria including company size, pain points, and triggers"
              error={errors.idealCustomerProfile}
            />
          </div>
        </div>
      </Card>

      {/* SECTION D */}
      <Card variant="elevated" padding="md" className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
          <span className="text-base">🚀</span>
          <h3 className="text-sm font-bold text-[var(--content-primary)]">Outreach Goals</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {OUTREACH_GOALS.map((goal) => {
            const selected = (formData.outreachGoal || []).includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  selected
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/40 shadow-sm'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--content-secondary)] hover:border-[var(--content-tertiary)] hover:text-[var(--content-primary)]'
                }`}
              >
                <span className="text-lg">{goal.icon}</span>
                <span className="text-xs font-semibold">{goal.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* SECTION E */}
      <Card variant="elevated" padding="md" className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
          <span className="text-base">💬</span>
          <h3 className="text-sm font-bold text-[var(--content-primary)]">Communication Style</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {TONE_OPTIONS.map((tone) => {
            const selected = formData.toneOfVoice === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => setFormData({ ...formData, toneOfVoice: tone.id })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/40 shadow-sm'
                    : 'border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--content-secondary)] hover:border-[var(--content-tertiary)] hover:text-[var(--content-primary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--content-primary)]">
                    {tone.label}
                  </span>
                  {selected && (
                    <Badge variant="brand" size="sm">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-2xs text-[var(--content-tertiary)] mt-1">{tone.desc}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        <Button variant="primary" size="lg" onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
