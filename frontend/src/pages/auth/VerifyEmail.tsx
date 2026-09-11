import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { VerificationCodeInput } from '../../components/auth/VerificationCodeInput';
import { AuthService } from '../../services/auth.service';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../routes/routes';

type VerifyState = 'form' | 'verifying' | 'success' | 'already_verified';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [state, setState] = useState<VerifyState>(tokenParam ? 'verifying' : 'form');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Resend cooldown timer
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // If a legacy token is in URL, auto-verify it
  useEffect(() => {
    if (!tokenParam.trim()) return;

    let isMounted = true;

    async function verifyToken() {
      try {
        const result = await AuthService.verifyEmail(tokenParam);
        if (!isMounted) return;

        if (result.code === 'ALREADY_VERIFIED') {
          setState('already_verified');
        } else {
          setState('success');
          toast.success({
            title: 'Email verified',
            description: 'Your MailFlow account is now active.',
          });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const apiErr = err as { response?: { data?: { error?: string; code?: string } } };
        const apiCode = apiErr.response?.data?.code;
        const msg = apiErr.response?.data?.error;

        if (apiCode === 'ALREADY_VERIFIED') {
          setState('already_verified');
        } else {
          setState('form');
          setErrorMessage(
            msg || 'Verification failed. Please enter your email and 6-digit code below.'
          );
        }
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [tokenParam, toast]);

  const handleVerifyCode = async (codeToVerify?: string) => {
    const codeVal = codeToVerify || code;
    if (!email.trim() || codeVal.length !== 6 || loading) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await AuthService.verifyCode(email.trim(), codeVal);
      if (result.code === 'ALREADY_VERIFIED') {
        setState('already_verified');
      } else {
        setState('success');
        toast.success({
          title: 'Email verified',
          description: result.message || 'Your MailFlow account is now active.',
        });
      }
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { error?: string; code?: string; attemptsRemaining?: number } };
      };
      const data = apiErr.response?.data;
      const msg = data?.error || 'Invalid verification code. Please try again.';
      setErrorMessage(msg);
      toast.error({
        title: 'Verification failed',
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendCountdown > 0 || resending) return;

    setResending(true);
    setErrorMessage('');
    try {
      await AuthService.resendVerification(email.trim());
      setResendCountdown(60);
      setCode('');
      toast.success({
        title: 'Verification code sent',
        description: 'Please check your inbox for your 6-digit code.',
      });
    } catch {
      toast.error({
        title: 'Resend failed',
        description:
          'Failed to resend verification code. Please check your email address and try again.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
      {/* State: VERIFYING (legacy token) */}
      {state === 'verifying' && (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-3 border-[#0b37a0] border-t-transparent animate-spin" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--content-primary)] tracking-tight">
              Verifying your email...
            </h2>
            <p className="text-sm text-[var(--content-secondary)]">
              Please wait while we activate your MailFlow account.
            </p>
          </div>
        </div>
      )}

      {/* State: SUCCESS */}
      {state === 'success' && (
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0b37a0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Email verified successfully!
            </h2>
            <p className="text-sm text-[var(--content-secondary)]">
              Your MailFlow account is now active. You can log in and start your campaigns.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate(ROUTES.LOGIN)}
            className="mt-2"
          >
            Continue to Login
          </Button>
        </div>
      )}

      {/* State: ALREADY VERIFIED */}
      {state === 'already_verified' && (
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0b37a0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Your email has already been verified.
            </h2>
            <p className="text-sm text-[var(--content-secondary)]">
              Your account is already active. Please sign in to access your workspace.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate(ROUTES.LOGIN)}
            className="mt-2"
          >
            Sign In
          </Button>
        </div>
      )}

      {/* State: FORM (Enter email + 6-digit code) */}
      {state === 'form' && (
        <div className="py-2 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0b37a0] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
              <svg
                className="w-7 h-7"
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
            </div>
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Verify your email
            </h2>
            <p className="text-sm text-[var(--content-secondary)]">
              Enter your account email and the 6-digit verification code sent to your inbox.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2 text-center">
                6-Digit Verification Code
              </label>
              <VerificationCodeInput
                value={code}
                onChange={(val) => {
                  setCode(val);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={loading}
                error={!!errorMessage}
                onComplete={(c) => handleVerifyCode(c)}
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium text-center">
                {errorMessage}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!email.trim() || code.length !== 6 || loading}
              onClick={() => handleVerifyCode()}
            >
              Verify Email
            </Button>
          </div>

          <div className="pt-3 border-t border-[var(--surface-border)] space-y-3">
            <div className="text-center">
              <p className="text-xs text-[var(--content-tertiary)] mb-2">
                Didn&apos;t receive the code or need a new one?
              </p>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                loading={resending}
                disabled={!email.trim() || resendCountdown > 0 || resending}
                onClick={handleResend}
              >
                {resendCountdown > 0
                  ? `Resend code in ${resendCountdown}s`
                  : 'Resend Verification Code'}
              </Button>
            </div>

            <div className="text-center text-xs text-[var(--content-secondary)] pt-1">
              Already active?{' '}
              <Link to={ROUTES.LOGIN} className="font-semibold text-brand-400 hover:text-brand-300">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
