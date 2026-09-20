import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settings.service';
import { SettingsEnvelope } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Skeleton } from '../../components/ui';
import { ProfileTab } from '../../components/settings/ProfileTab';
import { SecurityTab } from '../../components/settings/SecurityTab';
import { SmtpSettingsForm } from '../../components/smtp/SmtpSettingsForm';
import { WhatsappIntegrationTab } from '../../components/settings/WhatsappIntegrationTab';
import { BusinessProfileTab } from '../../components/settings/BusinessProfileTab';
import { cn } from '../../utils/cn';

type TabKey = 'profile' | 'business' | 'security' | 'email' | 'whatsapp';

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'business', label: 'Business Profile' },
  { id: 'security', label: 'Security' },
  { id: 'email', label: 'Email Providers' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

export default function Settings() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [data, setData] = useState<SettingsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingsService.getSettings();
      setData(res);
    } catch {
      toast.error('Failed to load workspace settings.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="text" className="w-48 h-8" />
        <Skeleton variant="rect" className="w-full h-12 rounded-xl" />
        <Skeleton variant="rect" className="w-full h-96 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-[var(--content-secondary)] mt-0.5">
          Configure user profile, company details, authentication security, SMTP delivery, and
          WhatsApp Cloud API.
        </p>
      </div>

      <div className="flex border-b border-[var(--surface-border)] gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            )}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <ProfileTab
          profile={data.profile}
          onUpdated={(updated) => setData((prev) => (prev ? { ...prev, profile: updated } : prev))}
        />
      )}

      {activeTab === 'business' && <BusinessProfileTab />}

      {activeTab === 'security' && <SecurityTab />}

      {activeTab === 'email' && <SmtpSettingsForm />}

      {activeTab === 'whatsapp' && (
        <WhatsappIntegrationTab config={data.whatsappConfig} onUpdated={loadSettings} />
      )}
    </div>
  );
}
