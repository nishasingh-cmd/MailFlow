import { useState, useEffect } from 'react';
import { SmtpProviderType, SmtpEncryption, SmtpConfig } from '@mailflow/shared';
import { smtpService } from '../../services/smtp.service';
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

  useEffect(() => {
    if (!testResult) return;
    const timer = setTimeout(() => {
      setTestResult(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [testResult]);

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
      setTestResult({
        success: false,
        message: 'Please fill in Host, Port, and Username before testing.',
      });
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'SMTP Connection test failed';
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !port || !username || !fromName || !fromEmail) {
      setTestResult({ success: false, message: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    setTestResult(null);
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
      setTestResult({
        success: true,
        message: 'SMTP Configuration saved and verified successfully!',
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || 'Failed to save SMTP configuration';
      setTestResult({ success: false, message: msg });
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
        <Select
          id="smtp-provider"
          label="SMTP Provider Preset"
          value={provider}
          onChange={handleProviderChange}
          options={PROVIDER_OPTIONS}
        />

        {provider === 'GMAIL' && (
          <div className="text-xs text-black dark:text-neutral-100 space-y-1.5 pt-1">
            <div className="font-bold text-black dark:text-white">Gmail App Password Required</div>
            <p className="text-black dark:text-neutral-200 leading-relaxed">
              Google standard account passwords will not work for SMTP. To generate a 16-character
              App Password:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-black dark:text-neutral-200 text-[11px] font-mono pt-1">
              <li>
                Open Google Account (myaccount.google.com) &rarr;{' '}
                <strong className="text-black dark:text-white font-bold">Security</strong>
              </li>
              <li>
                Ensure{' '}
                <strong className="text-black dark:text-white font-bold">
                  2-Step Verification
                </strong>{' '}
                is ON
              </li>
              <li>
                Search for{' '}
                <strong className="text-black dark:text-white font-bold">App Passwords</strong>{' '}
                &rarr; Create a new key for "Mail"
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

        {testResult && (
          <div
            className={`w-full rounded-lg p-3.5 text-xs font-medium text-white flex items-center justify-between gap-3 animate-fade-in ${
              testResult.success
                ? 'bg-green-600 border border-green-500 shadow-sm'
                : 'bg-red-600 border border-red-500 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm leading-none">
                {testResult.success ? '✓' : '✕'}
              </span>
              <span>{testResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
        )}
      </form>
    </Card>
  );
}
