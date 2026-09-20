import { useState } from 'react';
import { useMetaEmbeddedSignup } from '../../hooks/useMetaEmbeddedSignup';
import { WhatsappConfigData } from '@mailflow/shared';

interface ConnectWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (config: WhatsappConfigData) => void;
}

type NumberType = 'new' | 'active';

const PhoneIcon = () => (
  <svg
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
  </svg>
);

const ChatIcon = () => (
  <svg
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const OPTIONS: { id: NumberType; icon: React.ReactNode; label: string }[] = [
  {
    id: 'new',
    icon: <PhoneIcon />,
    label: 'I want to use a new number that is not active on any WhatsApp Business app',
  },
  {
    id: 'active',
    icon: <ChatIcon />,
    label: "I want to use a phone number that's currently active on WhatsApp Business app",
  },
];

function toEnglishError(msg: string | null): string {
  if (!msg) return '';
  if (
    msg.includes('URL लोड') ||
    msg.includes('डोमेन') ||
    msg.toLowerCase().includes("can't load url") ||
    msg.toLowerCase().includes("domain of this url isn't included")
  ) {
    return "Can't load URL: The domain of this URL is not included in your Meta App's domains. To allow this URL, add this domain to the 'App Domains' and 'Allowed Domains for the JavaScript SDK' in your Meta App Settings.";
  }
  if (/[\u0900-\u097F]/.test(msg)) {
    return 'Meta OAuth Error: The current domain or redirect URL is not authorized in your Meta App Settings. Please check App Domains in Meta Developer Console.';
  }
  return msg;
}

export function ConnectWhatsAppModal({ open, onClose, onSuccess }: ConnectWhatsAppModalProps) {
  const [selected, setSelected] = useState<NumberType>('new');
  const [otpConfirmed, setOtpConfirmed] = useState(false);

  const { status, error, launch, reset } = useMetaEmbeddedSignup((newConfig) => {
    onSuccess?.(newConfig);
    onClose();
  });

  const isConnecting =
    status === 'loading_sdk' || status === 'signing_up' || status === 'processing';

  const handleClose = () => {
    if (isConnecting) return;
    reset();
    onClose();
  };

  const handleConnect = () => {
    if (!otpConfirmed || isConnecting) return;
    launch();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-indigo-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 flex-1">Connect WhatsApp Business API</h2>
          <button
            onClick={handleClose}
            disabled={isConnecting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* 2 Option Cards */}
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.map((opt) => {
              const active = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  disabled={isConnecting}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all flex flex-col gap-3 ${
                    active
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  {/* Selection indicator */}
                  <span className="absolute top-3 right-3">
                    {active ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-gray-300 block" />
                    )}
                  </span>

                  {/* Icon box */}
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {opt.icon}
                  </span>

                  {/* Label */}
                  <p className="text-sm font-medium text-gray-800 leading-snug pr-5">{opt.label}</p>
                </button>
              );
            })}
          </div>

          {/* Verification Requirements */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-gray-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-800">Verification Requirements</span>
            </div>
            <label
              className="flex items-start gap-3 cursor-pointer group select-none"
              onClick={() => !isConnecting && setOtpConfirmed((v) => !v)}
            >
              <span
                className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-colors ${
                  otpConfirmed
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-gray-300 bg-white group-hover:border-indigo-400'
                }`}
              >
                {otpConfirmed && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-gray-700">
                I confirm that I can receive OTP (One-Time Password) via SMS or Call on this number
              </span>
            </label>
          </div>

          {/* Error Banner in Black Border Box */}
          {error && (
            <div className="rounded-xl border-2 border-black bg-white dark:bg-zinc-900 p-3.5 flex items-start gap-3 shadow-sm animate-in fade-in">
              <svg
                className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                  Meta OAuth Error
                </p>
                <div className="text-xs text-black dark:text-zinc-200 leading-relaxed font-medium">
                  {toEnglishError(error)}
                </div>
              </div>
            </div>
          )}

          <div className="pt-1 text-center">
            <a
              href="/settings"
              onClick={handleClose}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              Have Meta Cloud API credentials? Connect manually via Settings →
            </a>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-indigo-500 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-indigo-500 hover:underline">
              Privacy Policy
            </a>
          </p>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleClose}
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={!otpConfirmed || isConnecting}
              className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
                otpConfirmed && !isConnecting
                  ? 'bg-[#1877F2] text-white hover:bg-[#166FE5] shadow-sm cursor-pointer'
                  : isConnecting
                    ? 'bg-[#1877F2]/80 text-white cursor-wait'
                    : 'bg-[#1877F2]/30 text-white/70 cursor-not-allowed'
              }`}
            >
              {isConnecting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>
                    {status === 'loading_sdk'
                      ? 'Loading Meta SDK...'
                      : status === 'signing_up'
                        ? 'Waiting for Facebook...'
                        : 'Connecting WhatsApp...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
