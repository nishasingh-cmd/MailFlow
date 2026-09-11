import { useState, type FormEvent } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { AuthService } from '../../services/auth.service';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../routes/routes';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await AuthService.resetPassword(token, password, confirmPassword);
      setSubmitted(true);
      toast.success('Your password has been reset successfully.');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      const msg =
        apiErr.response?.data?.error ||
        apiErr.message ||
        'Failed to reset password. The link may have expired.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // If no token in URL
  if (!token && !submitted) {
    return (
      <Card className="w-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
        <div className="text-center py-4 space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--content-primary)]">Invalid Reset Link</h2>
            <p className="mt-2 text-sm text-[var(--content-secondary)] leading-relaxed">
              This password reset link is missing a security token or has already been processed.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Link to={ROUTES.FORGOT_PASSWORD}>
              <Button variant="primary" fullWidth>
                Request New Reset Link
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button variant="ghost" fullWidth>
                Back to Sign in
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
      {submitted ? (
        <div className="text-center py-4 space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--content-primary)]">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-sm text-[var(--content-secondary)] leading-relaxed">
              Your password has been updated successfully. You can now log in with your new
              credentials.
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
            >
              Back to Sign in
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Create new password
            </h2>
            <p className="mt-1.5 text-sm text-[var(--content-secondary)]">
              Your new password must be at least 8 characters long.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter at least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[var(--content-tertiary)] hover:text-[var(--content-primary)] focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                }
              />
            </div>

            <div className="space-y-1">
              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                autoComplete="new-password"
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-2xs text-red-400 font-medium">Passwords do not match</p>
            )}

            {password && password.length >= 8 && confirmPassword === password && (
              <p className="text-2xs text-emerald-400 font-medium">✓ Passwords match</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || !password || password.length < 8 || password !== confirmPassword}
              className="mt-2"
            >
              {loading ? 'Updating Password…' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center text-xs text-[var(--content-secondary)]">
            Remember your credentials?{' '}
            <Link
              to={ROUTES.LOGIN}
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
            >
              Back to Sign in
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
