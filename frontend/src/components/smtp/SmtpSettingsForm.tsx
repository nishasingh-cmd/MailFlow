import { useState, useEffect } from 'react';
import { SmtpProviderType, SmtpEncryption, SmtpConfig } from '@mailflow/shared';
import { smtpService } from '../../services/smtp.service';
import { useToast } from '../../hooks/useToast';
import { Card, Button, Input, Select, Badge } from '../ui';

const PROVIDER_OPTIONS = [
  { value: 'GMAIL', label: 'Gmail SMTP' },
  { value: 'OUTLOOK', label: 'Outlook / Office 365' },
  { value: 'CUSTOM', label: 'Custom SMTP' },
];

const ENCRYPTION_OPTIONS = [
  { value: 'TLS', label: 'TLS (STARTTLS / Port 587)' },
  { value: 'SSL', label: 'SSL (Port 465)' },
  { value: 'NONE', label: 'None (Unencrypted)' },
];

const PRESETS: Record<
  SmtpProviderType,
  { host: string; port: number; encryption: SmtpEncryption }
> = {
  GMAIL: { host: 'smtp.gmail.com', port: 587, encryption: 'TLS' },
  OUTLOOK: { host: 'smtp.office365.com', port: 587, encryption: 'TLS' },
  CUSTOM: { host: '', port: 587, encryption: 'TLS' },
};

export function SmtpSettingsForm() {
  const { toast } = useToast();

  const [provider, setProvider] = useState<SmtpProviderType>('GMAIL');
  const [host, setHost] = useState(PRESETS.GMAIL.host);
  const [port, setPort] = useState(PRESETS.GMAIL.port);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState<SmtpEncryption>('TLS');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  const [existingConfig, setExistingConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing SMTP config
  useEffect(() => {
    smtpService
      .getConfig()
      .then((config) => {
        if (config) {
          setExistingConfig(config);
          setProvider(config.provider || 'CUSTOM');
          setHost(config.host);
          setPort(config.port);
          setUsername(config.username);
          setPassword(config.password || '••••••••');
          setEncryption(config.encryption);
          setFromName(config.fromName);
          setFromEmail(config.fromEmail);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleProviderChange = (val: string) => {
    const p = val as SmtpProviderType;
    setProvider(p);
    if (p in PRESETS) {
      setHost(PRESETS[p].host);
      setPort(PRESETS[p].port);
      setEncryption(PRESETS[p].encryption);
    }
  };

  const handleTest = async () => {
    if (!host || !port || !username) {
      toast.error('Please fill in Host, Port, and Username before testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await smtpService.testConnection({
        provider,
        host,
        port,
        username,
        password,
        encryption,
        fromName,
        fromEmail,
      });
      setTestResult(res);
      toast.success(res.message);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'SMTP Connection test failed';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !port || !username || !fromName || !fromEmail) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const saved = await smtpService.saveConfig({
        provider,
        host,
        port,
        username,
        password: password || undefined,
        encryption,
        fromName,
        fromEmail,
      });
      setExistingConfig(saved);
      setPassword('••••••••');
      toast.success('SMTP Configuration saved and verified successfully!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'Failed to save SMTP configuration';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card variant="default" className="p-6">
        <p className="text-sm text-[var(--content-tertiary)]">Loading SMTP Configuration...</p>
      </Card>
    );
  }

  return (
    <Card variant="default" className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--content-primary)]">
            SMTP Server Configuration
          </h2>
          <p className="text-xs text-[var(--content-secondary)] mt-0.5">
            Configure the email server credentials used for delivering campaign emails.
          </p>
        </div>
        {existingConfig ? (
          <Badge variant="success" dot>
            Configured
          </Badge>
        ) : (
          <Badge variant="warning" dot>
            Not Configured
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Preset Selector */}
        <Select
          id="smtp-provider"
          label="SMTP Provider Preset"
          value={provider}
          onChange={handleProviderChange}
          options={PROVIDER_OPTIONS}
        />

        {provider === 'GMAIL' && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300 space-y-1.5">
            <div className="font-semibold text-amber-200">💡 Gmail App Password Required</div>
            <p className="text-amber-300/90 leading-relaxed">
              Google standard account passwords will not work for SMTP. To generate a 16-character
              App Password:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-300/80 text-[11px] font-mono pt-1">
              <li>
                Open Google Account (myaccount.google.com) &rarr; <strong>Security</strong>
              </li>
              <li>
                Ensure <strong>2-Step Verification</strong> is ON
              </li>
              <li>
                Search for <strong>App Passwords</strong> &rarr; Create a new key for "Mail"
              </li>
              <li>Paste the generated 16-character code (without spaces) as your Password below</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="smtp-host"
            label="SMTP Host *"
            placeholder="e.g. smtp.gmail.com"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
          <Input
            id="smtp-port"
            label="SMTP Port *"
            type="number"
            placeholder="587"
            value={String(port)}
            onChange={(e) => setPort(parseInt(e.target.value, 10) || 587)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="smtp-username"
            label="Username / Sender Email *"
            placeholder="you@domain.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            id="smtp-password"
            label="SMTP Password / App Password *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Select
          id="smtp-encryption"
          label="Encryption Type"
          value={encryption}
          onChange={(val) => setEncryption(val as SmtpEncryption)}
          options={ENCRYPTION_OPTIONS}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--surface-border)]">
          <Input
            id="smtp-from-name"
            label="Sender Name (From Name) *"
            placeholder="e.g. John Doe"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            required
          />
          <Input
            id="smtp-from-email"
            label="Sender Email (From Email) *"
            type="email"
            placeholder="you@domain.com"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            required
          />
        </div>

        {/* Test Result Indicator */}
        {testResult && (
          <div
            className={`rounded-lg border p-3.5 text-xs font-medium ${
              testResult.success
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {testResult.success ? '✓ ' : '✕ '}
            {testResult.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            loading={testing}
            disabled={testing || saving}
          >
            Test Connection
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={saving || testing}>
            Save Configuration
          </Button>
        </div>
      </form>
    </Card>
  );
}
