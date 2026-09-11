import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { VerificationCodeInput } from '../../components/auth/VerificationCodeInput';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { AuthService } from '../../services/auth.service';
import { ROUTES } from '../../routes/routes';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 6-digit verification code screen state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({ name: fullName, email: email.trim(), password });
      setSubmittedEmail(res.email || email.trim());
      setIsSubmitted(true);
      setVerificationCode('');
      setVerifyError('');
      setVerifySuccess(false);
      setResendCountdown(60);
      toast.success({
        title: 'Account created!',
        description: 'Please enter the 6-digit verification code sent to your email.',
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      const msg = apiErr.response?.data?.error ?? 'Failed to create account. Please try again.';
      setError(msg);
      toast.error({ title: 'Registration failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || verificationCode;
    if (code.length !== 6 || verifyingCode) return;

    setVerifyingCode(true);
    setVerifyError('');

    try {
      const result = await AuthService.verifyCode(submittedEmail, code);
      setVerifySuccess(true);
      toast.success({
        title: 'Email verified',
        description: result.message || 'Your MailFlow account is now active.',
      });
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { error?: string; code?: string; attemptsRemaining?: number } };
      };
      const data = apiErr.response?.data;
      const msg = data?.error || 'Invalid verification code. Please try again.';
      setVerifyError(msg);
      toast.error({
        title: 'Verification failed',
        description: msg,
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail || resendCountdown > 0) return;

    setResending(true);
    setVerifyError('');
    try {
      await AuthService.resendVerification(submittedEmail);
      setResendCountdown(60);
      setVerificationCode('');
      toast.success({
        title: 'Verification code sent',
        description: 'Please check your email inbox for your new 6-digit code.',
      });
    } catch {
      toast.error({
        title: 'Resend failed',
        description: 'Failed to resend verification code. Please try again later.',
      });
    } finally {
      setResending(false);
    }
  };

  // Screen 2: 6-digit verification code input
  if (isSubmitted) {
    if (verifySuccess) {
      return (
        <Card className="w-full max-w-md mx-auto bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
          <div className="py-4 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
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
                Your MailFlow account is now active. You can log in and start sending campaigns.
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
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-md mx-auto bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
        <div className="py-2 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
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

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Enter verification code
            </h2>
            <p className="text-sm text-[var(--content-secondary)]">
              We&apos;ve sent a 6-digit verification code to:
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {submittedEmail}
            </p>
          </div>

          <p className="text-xs text-[var(--content-secondary)] max-w-sm">
            Enter the code below to verify your email. The code expires in 10 minutes.
          </p>

          <div className="w-full space-y-4">
            <VerificationCodeInput
              value={verificationCode}
              onChange={(val) => {
                setVerificationCode(val);
                if (verifyError) setVerifyError('');
              }}
              disabled={verifyingCode}
              error={!!verifyError}
              onComplete={(code) => handleVerifyCode(code)}
            />

            {verifyError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium text-center">
                {verifyError}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={verifyingCode}
              disabled={verificationCode.length !== 6 || verifyingCode}
              onClick={() => handleVerifyCode()}
            >
              Verify Email
            </Button>
          </div>

          <div className="w-full space-y-3 pt-2">
            <p className="text-xs font-medium text-[var(--content-tertiary)]">
              Didn&apos;t receive the code?
            </p>

            <Button
              variant="secondary"
              size="md"
              fullWidth
              loading={resending}
              disabled={resendCountdown > 0 || resending}
              onClick={handleResend}
            >
              {resendCountdown > 0
                ? `Resend code in ${resendCountdown}s`
                : 'Resend Verification Code'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => {
                setIsSubmitted(false);
                setVerifyError('');
                setVerificationCode('');
              }}
            >
              Change Email
            </Button>
          </div>

          <div className="w-full pt-4 border-t border-[var(--surface-border)] text-center text-xs text-[var(--content-secondary)]">
            Already verified your account?{' '}
            <Link
              to={ROUTES.LOGIN}
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Screen 1: Registration Form
  return (
    <Card className="w-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Create your MailFlow account
        </h2>
        <p className="mt-1.5 text-sm text-[var(--content-secondary)]">
          Start your cold outreach pipeline today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Full name"
          placeholder="Nisha Singh"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />

        <Input
          label="Work email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          className="mt-2"
        >
          Create Account
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center text-xs text-[var(--content-secondary)]">
        Already have an account?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
        >
          Sign in
        </Link>
      </div>
    </Card>
  );
}
