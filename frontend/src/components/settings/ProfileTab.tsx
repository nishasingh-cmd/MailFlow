import { useState } from 'react';
import { UserProfileData } from '@mailflow/shared';
import { settingsService } from '../../services/settings.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Avatar } from '../ui';

interface ProfileTabProps {
  profile: UserProfileData;
  onUpdated: (p: UserProfileData) => void;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET - US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (CT - US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT - US & Canada)' },
  { value: 'Europe/London', label: 'London / GMT' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST - UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
];

export function ProfileTab({ profile, onUpdated }: ProfileTabProps) {
  const { toast } = useToast();

  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [avatar, setAvatar] = useState(profile.avatar || '');
  const [companyName, setCompanyName] = useState(profile.companyName || '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle || '');
  const [timeZone, setTimeZone] = useState(profile.timeZone || 'UTC');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatar: avatar.trim() || null,
        companyName: companyName.trim() || null,
        jobTitle: jobTitle.trim() || null,
        timeZone,
      });

      onUpdated(updated);
      toast.success('✅ Workspace profile updated successfully!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-[var(--content-primary)]">
          User Profile Settings
        </h3>
        <p className="text-xs text-[var(--content-secondary)] mt-0.5">
          Manage your account identity, organization details, and preferred timezone.
        </p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-5 p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
        <Avatar name={name || 'User'} src={avatar || undefined} size="xl" />
        <div className="space-y-2 flex-1">
          <Input
            id="avatar-url"
            label="Profile Avatar URL"
            placeholder="https://example.com/avatar.jpg"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          <p className="text-2xs text-[var(--content-tertiary)]">
            Enter a direct image URL for your profile picture.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-4 shadow-elevation-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="full-name"
            label="Full Name *"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email-address"
            label="Email Address *"
            placeholder="john@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="company-name"
            label="Company Name"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            id="job-title"
            label="Job Title"
            placeholder="Head of Sales Outreach"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <Select
            id="user-timezone"
            label="Time Zone"
            value={timeZone}
            onChange={(val) => setTimeZone(val)}
            options={TIMEZONES}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--surface-border)]">
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
