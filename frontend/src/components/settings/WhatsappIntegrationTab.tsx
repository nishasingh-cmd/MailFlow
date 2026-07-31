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
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(
    config.webhookVerifyToken || 'mailflow_verify_token'
  );
  const [appSecret, setAppSecret] = useState('');
  const [graphApiVersion, setGraphApiVersion] = useState(config.graphApiVersion || 'v20.0');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = config.webhookUrl || `${window.location.origin}/api/whatsapp/webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.saveWhatsappConfig({
        provider,
        businessAccountId: businessAccountId.trim() || undefined,
        phoneNumberId: phoneNumberId.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
        webhookVerifyToken: webhookVerifyToken.trim() || undefined,
        appSecret: appSecret.trim() || undefined,
        graphApiVersion: graphApiVersion.trim() || 'v20.0',
      });

      toast.success('💬 WhatsApp Business Configuration saved successfully.');
      onUpdated();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        err.response?.data?.error || err.message || 'Failed to save WhatsApp configuration.'
      );
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

  const handleReset = async () => {
    if (
      !window.confirm('Are you sure you want to reset WhatsApp integration to Mock Provider mode?')
    )
      return;

    setResetting(true);
    try {
      const res = await settingsService.resetWhatsappConfig();
      toast.info(`ℹ️ ${res.message}`);
      setProvider('MOCK');
      setBusinessAccountId('');
      setPhoneNumberId('');
      setAccessToken('');
      setAppSecret('');
      onUpdated();
    } catch {
      toast.error('Failed to reset WhatsApp configuration.');
    } finally {
      setResetting(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const isConnected = config.status === 'CONNECTED';
  const isMockActive = provider === 'MOCK' || config.status === 'MOCK_ACTIVE';
  const isFailed = config.status === 'FAILED';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--content-primary)]">
            WhatsApp Business Configuration
          </h3>
          <p className="text-xs text-[var(--content-secondary)] mt-0.5">
            Configure Meta WhatsApp Cloud API credentials or fall back seamlessly to Mock
            simulation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge variant="success" size="md" dot>
              Connected
            </Badge>
          )}
          {isMockActive && (
            <Badge variant="brand" size="md" dot>
              Mock Provider Active
            </Badge>
          )}
          {isFailed && (
            <Badge variant="error" size="md" dot>
              Disconnected / Failed
            </Badge>
          )}
          {config.lastTestedAt && (
            <span className="text-2xs text-[var(--content-tertiary)]">
              Verified: {new Date(config.lastTestedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Validation Error Message Box */}
      {config.errorMessage && isFailed && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold text-red-200">Connection Validation Error</p>
            <p className="text-red-300/90 mt-0.5">{config.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Mock Active Banner */}
      {isMockActive && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="font-semibold text-[var(--content-primary)]">
              Mock Mode Enabled (Development & Testing)
            </p>
            <p className="text-indigo-300/80 mt-0.5">
              No Meta API credentials required. MailFlow automatically simulates real network
              WhatsApp dispatches with 2–4 second delays, mock message IDs, and queue tracking.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-elevation-1">
        <Select
          id="wa-provider"
          label="Provider Dispatch Mode"
          value={provider}
          onChange={(val) => setProvider(val as 'MOCK' | 'META_CLOUD')}
          options={WA_PROVIDERS}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="phone-number-id"
            label="Phone Number ID"
            placeholder="e.g. 104928374928374"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
          <Input
            id="business-account-id"
            label="WhatsApp Business Account ID"
            placeholder="e.g. 109283749283749"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
          />
        </div>

        {/* Permanent Access Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">
              Permanent Access Token
            </label>
            {config.hasAccessToken && (
              <span className="text-green-400 font-mono text-2xs">✓ Encrypted Token Saved</span>
            )}
          </div>
          <div className="relative">
            <Input
              id="wa-access-token"
              type={showToken ? 'text' : 'password'}
              placeholder={config.hasAccessToken ? '••••••••••••••••••••••••' : 'EAAB...'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-2.5 text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)] font-medium"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-2xs text-[var(--content-tertiary)]">
            Token is securely encrypted in database using AES-256 and never exposed in responses.
          </p>
        </div>

        {/* Webhook & Graph API Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--surface-border)]">
          <Input
            id="webhook-verify-token"
            label="Webhook Verify Token"
            placeholder="mailflow_verify_token"
            value={webhookVerifyToken}
            onChange={(e) => setWebhookVerifyToken(e.target.value)}
          />
          <Input
            id="graph-api-version"
            label="Graph API Version"
            placeholder="v20.0"
            value={graphApiVersion}
            onChange={(e) => setGraphApiVersion(e.target.value)}
          />
        </div>

        {/* App Secret (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">
              App Secret (Optional - for Webhook Signature Verification)
            </label>
            {config.hasAppSecret && (
              <span className="text-green-400 font-mono text-2xs">✓ Saved</span>
            )}
          </div>
          <div className="relative">
            <Input
              id="app-secret"
              type={showSecret ? 'text' : 'password'}
              placeholder={config.hasAppSecret ? '••••••••••••••••' : 'e.g. a1b2c3d4...'}
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-2.5 text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)] font-medium"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Webhook URL Readonly with Copy Button */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--surface-border)]">
          <label className="text-xs font-medium text-[var(--content-primary)]">
            Meta Webhook Callback URL
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              disabled
              className="flex-1 font-mono text-xs"
            />
            <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
              {copied ? 'Copied ✓' : 'Copy URL'}
            </Button>
          </div>
          <p className="text-2xs text-[var(--content-tertiary)]">
            Paste this URL and your Verify Token in your Meta App Dashboard under WhatsApp Webhook
            setup.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[var(--surface-border)]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              loading={testing}
              disabled={testing || saving || resetting}
            >
              Test Connection
            </Button>
            <Button
              variant="ghost"
              onClick={handleReset}
              loading={resetting}
              disabled={testing || saving || resetting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Reset Configuration
            </Button>
          </div>

          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving || testing || resetting}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
