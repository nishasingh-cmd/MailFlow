import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settings.service';
import { SettingsEnvelope } from '@mailflow/shared';
import { useToast } from '../../hooks/useToast';
import { Skeleton } from '../../components/ui';
import { ProfileTab } from '../../components/settings/ProfileTab';
import { SecurityTab } from '../../components/settings/SecurityTab';
import { SmtpSettingsForm } from '../../components/smtp/SmtpSettingsForm';
import { AiIntegrationTab } from '../../components/settings/AiIntegrationTab';
import { WhatsappIntegrationTab } from '../../components/settings/WhatsappIntegrationTab';
import { AppPreferencesTab } from '../../components/settings/AppPreferencesTab';
import { IntegrationsOverviewTab } from '../../components/settings/IntegrationsOverviewTab';
import { cn } from '../../utils/cn';

type TabKey = 'profile' | 'security' | 'email' | 'ai' | 'whatsapp' | 'preferences' | 'integrations';

const TABS: Array<{ id: TabKey; label: string; icon: string }> = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'email', label: 'Email Providers', icon: '✉️' },
  { id: 'ai', label: 'AI Integration', icon: '✨' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
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
          Settings & Integrations
        </h1>
        <p className="text-sm text-[var(--content-secondary)] mt-0.5">
          Configure user profile, authentication security, SMTP delivery, AI model keys, WhatsApp
          Cloud API, and application preferences.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[var(--surface-border)] gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 whitespace-nowrap',
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 font-semibold'
                : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <ProfileTab
          profile={data.profile}
          onUpdated={(updated) => setData((prev) => (prev ? { ...prev, profile: updated } : prev))}
        />
      )}

      {activeTab === 'security' && <SecurityTab />}

      {activeTab === 'email' && <SmtpSettingsForm />}

      {activeTab === 'ai' && <AiIntegrationTab config={data.aiConfig} onUpdated={loadSettings} />}

      {activeTab === 'whatsapp' && (
        <WhatsappIntegrationTab config={data.whatsappConfig} onUpdated={loadSettings} />
      )}

      {activeTab === 'preferences' && (
        <AppPreferencesTab preferences={data.preferences} onUpdated={loadSettings} />
      )}

      {activeTab === 'integrations' && (
        <IntegrationsOverviewTab
          integrations={data.integrations}
          onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
        />
      )}
    </div>
  );
}
