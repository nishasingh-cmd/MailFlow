import { useState } from 'react';
import { AppPreferencesData } from '@mailflow/shared';
import { settingsService } from '../../services/settings.service';
import { useToast } from '../../hooks/useToast';
import { Button, Select, Textarea } from '../ui';

interface AppPreferencesTabProps {
  preferences: AppPreferencesData;
  onUpdated: () => void;
}

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark Mode (Sleek Modern)' },
  { value: 'light', label: 'Light Mode (Clean)' },
  { value: 'system', label: 'System Preference' },
];

const AI_TONE_OPTIONS = [
  { value: 'Professional', label: 'Professional & Direct (Recommended B2B)' },
  { value: 'Friendly', label: 'Friendly & Casual' },
  { value: 'Persuasive', label: 'Persuasive & High Energy' },
  { value: 'Executive', label: 'Executive Brief (Short & Punchy)' },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'EMAIL', label: 'Cold Email Outreach' },
  { value: 'WHATSAPP', label: 'WhatsApp Direct Outreach' },
  { value: 'EMAIL_AND_WHATSAPP', label: 'Multi-channel (Email + WhatsApp)' },
];

export function AppPreferencesTab({ preferences, onUpdated }: AppPreferencesTabProps) {
  const { toast } = useToast();

  const [theme, setTheme] = useState(preferences.theme || 'dark');
  const [defaultAiTone, setDefaultAiTone] = useState(preferences.defaultAiTone || 'Professional');
  const [defaultCampaignType, setDefaultCampaignType] = useState(
    preferences.defaultCampaignType || 'EMAIL'
  );
  const [emailSignature, setEmailSignature] = useState(preferences.emailSignature || '');
  const [autoSaveDrafts, setAutoSaveDrafts] = useState(preferences.autoSaveDrafts ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updatePreferences({
        theme,
        defaultAiTone,
        defaultCampaignType,
        emailSignature: emailSignature.trim() || null,
        autoSaveDrafts,
      });

      toast.success('⚙️ Application preferences saved successfully!');
      onUpdated();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-[var(--content-primary)]">
          Application Preferences
        </h3>
        <p className="text-xs text-[var(--content-secondary)] mt-0.5">
          Customize UI theme, default AI prompt tones, campaign parameters, and email signatures.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-elevation-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="pref-theme"
            label="User Interface Theme"
            value={theme}
            onChange={(val) => setTheme(val as 'dark' | 'light' | 'system')}
            options={THEME_OPTIONS}
          />
          <Select
            id="pref-ai-tone"
            label="Default AI Generation Tone"
            value={defaultAiTone}
            onChange={(val) => setDefaultAiTone(val)}
            options={AI_TONE_OPTIONS}
          />
        </div>

        <Select
          id="pref-campaign-type"
          label="Default Campaign Outreach Channel"
          value={defaultCampaignType}
          onChange={(val) => setDefaultCampaignType(val)}
          options={CAMPAIGN_TYPE_OPTIONS}
        />

        <Textarea
          id="email-signature"
          label="Default Email Signature"
          placeholder="Best regards,&#10;John Doe | Head of Outreach&#10;Acme Corp"
          value={emailSignature}
          onChange={(e) => setEmailSignature(e.target.value)}
          rows={4}
        />

        {/* Auto Save Toggle */}
        <label className="flex items-center justify-between p-4 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-[var(--content-primary)]">Auto-Save Drafts</p>
            <p className="text-xs text-[var(--content-secondary)] mt-0.5">
              Automatically save email and WhatsApp message edits as drafts in real-time.
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoSaveDrafts}
            onChange={(e) => setAutoSaveDrafts(e.target.checked)}
            className="w-5 h-5 rounded accent-brand-500 cursor-pointer"
          />
        </label>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-[var(--surface-border)]">
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
