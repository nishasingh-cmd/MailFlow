import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { AuthService } from '../../services/auth.service';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../routes/routes';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      await AuthService.forgotPassword(email);
      setSubmitted(true);
      toast.info('Password reset request processed.');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      const msg = apiErr.response?.data?.error ?? 'Failed to process request. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--content-primary)]">Check your inbox</h2>
            <p className="mt-2 text-sm text-[var(--content-secondary)] leading-relaxed">
              If an account exists for{' '}
              <strong className="text-[var(--content-primary)]">{email}</strong>, a reset link has
              been sent.
            </p>
          </div>

          <div className="pt-4">
            <Link to={ROUTES.LOGIN}>
              <Button variant="outline" fullWidth>
                Back to Sign in
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
              Reset your password
            </h2>
            <p className="mt-1.5 text-sm text-[var(--content-secondary)]">
              Enter your registered email address and we&apos;ll send you a link to reset your
              password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Registered Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center text-xs text-[var(--content-secondary)]">
            Remembered your password?{' '}
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
