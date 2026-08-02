/**
 * MailFlow — Phase 2: WhatsApp Business Embedded Signup
 * WhatsApp Integration Settings Tab
 *
 * UI States:
 *  - MOCK_ACTIVE  — Mock provider banner + Connect button
 *  - DISCONNECTED — Empty state CTA
 *  - CONNECTING   — Progress steps (loading_sdk → signing_up → processing)
 *  - CONNECTED    — Business dashboard with Refresh + Disconnect
 *  - REFRESHING   — Skeleton overlay on dashboard
 *  - FAILED       — Error card with retry
 *  - DISCONNECTING — Confirm modal + loading state
 *
 * Security: No tokens displayed. No window.alert/confirm used.
 */
import { useState, useEffect, useCallback } from 'react';
import { WhatsappConfigData } from '@mailflow/shared';
import { whatsappService } from '../../services/whatsapp.service';
import { useMetaEmbeddedSignup } from '../../hooks/useMetaEmbeddedSignup';
import { useToast } from '../../hooks/useToast';
import { Button, Badge, Skeleton, ConfirmModal } from '../ui';

interface WhatsappIntegrationTabProps {
  config: WhatsappConfigData;
  onUpdated: () => void;
}

// ─── Helper: format date ──────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Status Badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: WhatsappConfigData['status'] }) {
  if (status === 'CONNECTED')
    return (
      <Badge variant="success" size="md" dot>
        Connected
      </Badge>
    );
  if (status === 'MOCK_ACTIVE')
    return (
      <Badge variant="brand" size="md" dot>
        Mock Provider Active
      </Badge>
    );
  if (status === 'FAILED')
    return (
      <Badge variant="error" size="md" dot>
        Disconnected / Failed
      </Badge>
    );
  return (
    <Badge variant="neutral" size="md" dot>
      Disconnected
    </Badge>
  );
}

// ─── Progress Steps (shown during connecting) ─────────────────────────────────
const CONNECT_STEPS = [
  { id: 'loading_sdk', label: 'Loading Facebook SDK...' },
  { id: 'signing_up', label: 'Opening Meta Signup...' },
  { id: 'processing', label: 'Exchanging credentials...' },
] as const;

function ConnectingProgress({ currentStep }: { currentStep: string }) {
  const activeIdx = CONNECT_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-brand-500/15 flex items-center justify-center">
          <span className="text-3xl animate-bounce-slow">💬</span>
        </div>
        <h3 className="text-base font-semibold text-[var(--content-primary)]">
          Connecting to Meta…
        </h3>
        <p className="text-sm text-[var(--content-secondary)] text-center max-w-xs">
          Complete the Meta signup in the popup window. Do not close it.
        </p>
      </div>

      <div className="space-y-3 max-w-xs mx-auto">
        {CONNECT_STEPS.map((step, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  isDone
                    ? 'bg-green-500/20 text-green-400'
                    : isActive
                      ? 'bg-brand-500/20 text-brand-400 ring-2 ring-brand-500/30'
                      : 'bg-[var(--surface-hover)] text-[var(--content-tertiary)]'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-sm ${
                  isActive
                    ? 'text-[var(--content-primary)] font-medium'
                    : isDone
                      ? 'text-green-400'
                      : 'text-[var(--content-tertiary)]'
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Connected Dashboard ──────────────────────────────────────────────────────
function ConnectedDashboard({
  config,
  onRefresh,
  onDisconnect,
  refreshing,
}: {
  config: WhatsappConfigData;
  onRefresh: () => void;
  onDisconnect: () => void;
  refreshing: boolean;
}) {
  const rows = [
    { label: 'Business Name', value: config.businessName || '—' },
    { label: 'Display Phone', value: config.displayPhone || config.phoneNumberId || '—' },
    { label: 'Phone Number ID', value: config.phoneNumberId || '—' },
    { label: 'Business Account ID', value: config.businessAccountId || '—' },
    { label: 'Provider', value: 'Meta WhatsApp Cloud API' },
    { label: 'Graph API Version', value: config.graphApiVersion || 'v25.0' },
    { label: 'Connected At', value: formatDate(config.connectedAt) },
    { label: 'Last Verified', value: formatDate(config.lastTestedAt) },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/15 flex items-center justify-center text-2xl">
            ✅
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--content-primary)]">
              {config.businessName || 'WhatsApp Business'}
            </h3>
            <p className="text-xs text-[var(--content-secondary)]">
              {config.displayPhone || config.phoneNumberId || 'Phone connected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={config.status} />
        </div>
      </div>

      {/* Detail Grid */}
      {refreshing ? (
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-4">
          {rows.map((_, i) => (
            <Skeleton key={i} variant="text" className={`h-5 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] divide-y divide-[var(--surface-border)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs font-medium text-[var(--content-secondary)] w-44 flex-shrink-0">
                {row.label}
              </span>
              <span className="text-xs text-[var(--content-primary)] font-mono text-right truncate">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onRefresh}
          loading={refreshing}
          disabled={refreshing}
          id="wa-refresh-btn"
        >
          🔄 Refresh Status
        </Button>

        <Button
          variant="ghost"
          onClick={onDisconnect}
          disabled={refreshing}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          id="wa-disconnect-btn"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

// ─── Disconnected / Mock State ────────────────────────────────────────────────
function DisconnectedState({
  status,
  errorMessage,
  onConnect,
  connecting,
}: {
  status: WhatsappConfigData['status'];
  errorMessage?: string | null;
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Error card */}
      {status === 'FAILED' && errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-red-200">Connection Failed</p>
            <p className="text-red-300/90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Mock active banner */}
      {status === 'MOCK_ACTIVE' && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs flex items-start gap-3">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <p className="font-semibold text-[var(--content-primary)]">Mock Mode Enabled</p>
            <p className="text-indigo-300/80 mt-0.5">
              MailFlow is simulating WhatsApp dispatches with 2–4 second delays and mock message
              IDs. Connect your Meta WhatsApp Business Account to send real messages.
            </p>
          </div>
        </div>
      )}

      {/* Main CTA card */}
      <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/20 flex items-center justify-center text-4xl shadow-lg">
          💬
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[var(--content-primary)]">
            Connect WhatsApp Business
          </h3>
          <p className="text-sm text-[var(--content-secondary)] max-w-sm leading-relaxed">
            Use Meta's official Embedded Signup to link your WhatsApp Business Account. No manual
            token copying — everything is automatic.
          </p>
        </div>

        <ul className="text-xs text-[var(--content-secondary)] space-y-1.5 text-left">
          {[
            'Automatic credential exchange',
            'AES-256 encrypted storage',
            'Instant connection verification',
            'No manual token required',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-green-400 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <Button
          variant="primary"
          onClick={onConnect}
          loading={connecting}
          disabled={connecting}
          id="wa-connect-btn"
          className="w-full max-w-xs"
        >
          {connecting ? 'Connecting…' : 'Connect WhatsApp'}
        </Button>

        <p className="text-2xs text-[var(--content-tertiary)] max-w-xs">
          A Meta popup will open. Log in to Facebook, select your Business Manager and phone number,
          then grant permissions.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WhatsappIntegrationTab({
  config: initialConfig,
  onUpdated,
}: WhatsappIntegrationTabProps) {
  const { toast } = useToast();

  const [config, setConfig] = useState<WhatsappConfigData>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Sync config when parent refreshes
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // ── Meta Embedded Signup hook ───────────────────────────────────────────────
  const {
    status: signupStatus,
    error: signupError,
    launch: launchSignup,
    reset: resetSignup,
  } = useMetaEmbeddedSignup(
    useCallback(
      (newConfig: WhatsappConfigData) => {
        setConfig(newConfig);
        toast.success('✅ WhatsApp Business connected successfully!');
        onUpdated();
      },
      [toast, onUpdated]
    )
  );

  const isConnecting =
    signupStatus === 'loading_sdk' ||
    signupStatus === 'signing_up' ||
    signupStatus === 'processing';

  const isConnected = config.status === 'CONNECTED' && !isConnecting;
  const hasError = signupStatus === 'error';

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await whatsappService.refresh();
      setConfig(result.config);
      toast.success('Connection details refreshed.');
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to refresh connection details.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await whatsappService.disconnect();
      const result = await whatsappService.getConnectionStatus();
      setConfig(result.config);
      toast.info('ℹ️ WhatsApp account disconnected. All message history preserved.');
      onUpdated();
      resetSignup();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to disconnect WhatsApp account.');
    } finally {
      setDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  // ── Reload status from API ───────────────────────────────────────────────────
  const handleReloadStatus = async () => {
    setLoading(true);
    try {
      const result = await whatsappService.getConnectionStatus();
      setConfig(result.config);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  // ── Connect attempt ──────────────────────────────────────────────────────────
  const handleConnect = () => {
    resetSignup();
    launchSignup();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton variant="rect" className="w-full h-24 rounded-xl" />
        <Skeleton variant="rect" className="w-full h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--content-primary)]">
            WhatsApp Business Configuration
          </h2>
          <p className="text-xs text-[var(--content-secondary)] mt-0.5">
            Connect your Meta WhatsApp Business Account via official Embedded Signup.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isConnecting && <StatusBadge status={config.status} />}
          <button
            onClick={handleReloadStatus}
            title="Reload status"
            className="text-[var(--content-tertiary)] hover:text-[var(--content-primary)] text-sm transition-colors"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main content area */}
      {isConnecting ? (
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
          <ConnectingProgress currentStep={signupStatus} />
        </div>
      ) : isConnected ? (
        <ConnectedDashboard
          config={config}
          onRefresh={handleRefresh}
          onDisconnect={() => setShowDisconnectConfirm(true)}
          refreshing={refreshing}
        />
      ) : (
        <DisconnectedState
          status={hasError ? 'FAILED' : config.status}
          errorMessage={hasError ? signupError : config.errorMessage}
          onConnect={handleConnect}
          connecting={isConnecting}
        />
      )}

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title="Disconnect WhatsApp?"
        description={
          <span>
            This will remove your Meta credentials from MailFlow. Your{' '}
            <strong>message history, delivery logs, and analytics</strong> will be preserved.
            <br />
            <br />
            You can reconnect at any time.
          </span>
        }
        confirmLabel="Yes, Disconnect"
        cancelLabel="Keep Connected"
        variant="danger"
        loading={disconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </div>
  );
}
