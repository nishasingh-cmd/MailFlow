import { useState, useEffect } from 'react';
import { Button, Input, Textarea, Select, Card, Skeleton } from '../ui';
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
        <div className="pb-3 border-b border-[var(--surface-border)]">
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
        <div className="pb-3 border-b border-[var(--surface-border)]">
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
