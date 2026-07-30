import { useState } from 'react';
import { WhatsappConfigData } from '@mailflow/shared';
import { settingsService } from '../../services/settings.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Badge } from '../ui';

interface WhatsappIntegrationTabProps {
  config: WhatsappConfigData;
  onUpdated: () => void;
}

const WA_PROVIDERS = [
  { value: 'MOCK', label: 'Mock WhatsApp Provider (Internal 2-4s Simulated Dispatch)' },
  { value: 'META_CLOUD', label: 'Meta WhatsApp Cloud API (Production Credentials)' },
];

export function WhatsappIntegrationTab({ config, onUpdated }: WhatsappIntegrationTabProps) {
  const { toast } = useToast();

  const [provider, setProvider] = useState<'MOCK' | 'META_CLOUD'>(config.provider || 'MOCK');
  const [businessAccountId, setBusinessAccountId] = useState(config.businessAccountId || '');
  const [phoneNumberId, setPhoneNumberId] = useState(config.phoneNumberId || '');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.saveWhatsappConfig({
        provider,
        businessAccountId: businessAccountId.trim() || undefined,
        phoneNumberId: phoneNumberId.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
      });

      toast.success('💬 WhatsApp configuration saved.');
      onUpdated();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to save WhatsApp config.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await settingsService.testWhatsappConnection();
      if (res.success) {
        toast.success(`✅ ${res.message}`);
      } else {
        toast.error(`⚠️ ${res.message}`);
      }
      onUpdated();
    } catch {
      toast.error('WhatsApp connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const isMockActive = provider === 'MOCK' || !config.hasAccessToken;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--content-primary)]">
            WhatsApp Outreach Engine
          </h3>
          <p className="text-xs text-[var(--content-secondary)] mt-0.5">
            Configure Meta WhatsApp Cloud API credentials or utilize the built-in Mock Provider
            simulation.
          </p>
        </div>
        <Badge variant={isMockActive ? 'warning' : 'success'} size="md" dot>
          {isMockActive ? 'Mock Provider Active' : 'Meta Cloud API Connected'}
        </Badge>
      </div>

      {/* Mock Active Banner */}
      {isMockActive && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="font-semibold text-[var(--content-primary)]">Mock Provider Enabled</p>
            <p className="text-amber-300/80 mt-0.5">
              No Meta credentials required. MailFlow automatically simulates real network WhatsApp
              dispatches with 2–4 second delays and mock message logs.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-elevation-1">
        <Select
          id="wa-provider"
          label="WhatsApp Provider Dispatch Mode"
          value={provider}
          onChange={(val) => setProvider(val as 'MOCK' | 'META_CLOUD')}
          options={WA_PROVIDERS}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="business-account-id"
            label="Meta Business Account ID"
            placeholder="e.g. 109283749283749"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
          />
          <Input
            id="phone-number-id"
            label="Phone Number ID"
            placeholder="e.g. 104928374928374"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
        </div>

        {/* Access Token Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">
              Meta Permanent Access Token
            </label>
            {config.hasAccessToken && (
              <span className="text-green-400 font-mono text-2xs">✓ Token Saved (Encrypted)</span>
            )}
          </div>
          <div className="relative">
            <Input
              id="wa-access-token"
              type={showToken ? 'text' : 'password'}
              placeholder={config.hasAccessToken ? '••••••••••••••••••••••••' : 'EAA...'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-2.5 text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)]"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Webhook URL Read Only */}
        <Input
          id="webhook-url"
          label="Webhook URL (Read Only)"
          value={config.webhookUrl || `https://api.mailflow.io/v1/webhooks/whatsapp`}
          disabled
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            loading={testing}
            disabled={testing || saving}
          >
            Validate & Test Connection
          </Button>

          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
