import { useState } from 'react';
import { AiConfigData } from '@mailflow/shared';
import { settingsService } from '../../services/settings.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Select, Badge } from '../ui';

interface AiIntegrationTabProps {
  config: AiConfigData;
  onUpdated: () => void;
}

const AI_PROVIDERS = [
  { value: 'OPENAI', label: 'OpenAI (GPT-4o, GPT-4o-mini)' },
  { value: 'GEMINI', label: 'Google Gemini AI (Gemini 1.5 Flash)' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Fast & Cost Effective)' },
  { value: 'gpt-4o', label: 'gpt-4o (High Intelligence B2B Strategy)' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Google GenAI)' },
];

export function AiIntegrationTab({ config, onUpdated }: AiIntegrationTabProps) {
  const { toast } = useToast();

  const [provider, setProvider] = useState<'OPENAI' | 'GEMINI'>(config.provider || 'OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(config.model || 'gpt-4o-mini');
  const [temperature, setTemperature] = useState(config.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens ?? 1000);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.saveAiConfig({
        provider,
        apiKey: apiKey.trim() || undefined,
        model,
        temperature,
        maxTokens,
      });

      toast.success('✨ AI Configuration saved successfully!');
      onUpdated();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await settingsService.testAiConnection({
        provider,
        apiKey: apiKey.trim() || undefined,
        model,
      });

      if (res.success) {
        toast.success(`✅ ${res.message}`);
      } else {
        toast.error(`⚠️ ${res.message}`);
      }
      onUpdated();
    } catch {
      toast.error('AI connection test failed. Verify API Key.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--content-primary)]">
            AI Model Integration
          </h3>
          <p className="text-xs text-[var(--content-secondary)] mt-0.5">
            Configure LLMs for company research analysis, cold email generation, and WhatsApp
            outreach.
          </p>
        </div>
        <Badge variant={config.status === 'CONNECTED' ? 'success' : 'neutral'} size="md" dot>
          {config.status === 'CONNECTED' ? 'Connected' : 'Disconnected / System Default'}
        </Badge>
      </div>

      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-elevation-1">
        <Select
          id="ai-provider"
          label="AI Provider Platform"
          value={provider}
          onChange={(val) => setProvider(val as 'OPENAI' | 'GEMINI')}
          options={AI_PROVIDERS}
        />

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">API Key</label>
            {config.hasApiKey && (
              <span className="text-green-400 font-mono text-2xs">
                ✓ Key Configured (Encrypted)
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="ai-api-key"
              type={showKey ? 'text' : 'password'}
              placeholder={config.hasApiKey ? '••••••••••••••••••••••••' : 'sk-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)]"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-2xs text-[var(--content-tertiary)]">
            Your key is encrypted with AES-256-GCM before database storage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="ai-model"
            label="Target LLM Model"
            value={model}
            onChange={(val) => setModel(val)}
            options={MODEL_OPTIONS}
          />
          <Input
            id="max-tokens"
            label="Max Tokens"
            type="number"
            value={String(maxTokens)}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1000)}
          />
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[var(--content-primary)]">
              Creativity / Temperature
            </label>
            <span className="font-mono text-brand-400 font-semibold">{temperature}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-[var(--surface-elevated)] accent-brand-500 cursor-pointer"
          />
          <div className="flex justify-between text-2xs text-[var(--content-tertiary)]">
            <span>0.0 (Precise / Analytical)</span>
            <span>0.5 (Balanced)</span>
            <span>1.0 (Creative Outreach)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            loading={testing}
            disabled={testing || saving}
          >
            Test AI Connection
          </Button>

          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
