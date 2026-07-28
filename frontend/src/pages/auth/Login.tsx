import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../routes/routes';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const user = await login({ email, password });
      toast.success({
        title: 'Welcome back!',
        description: `Logged in as ${user.name}`,
      });

      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      const msg =
        apiErr.response?.data?.error ?? 'Failed to log in. Please check your credentials.';
      setError(msg);
      toast.error({ title: 'Authentication failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Log in to MailFlow
        </h2>
        <p className="mt-1.5 text-sm text-[var(--content-secondary)]">
          Enter your credentials to access your account workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          leftIcon={
            <svg
              className="w-4 h-4"
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
          }
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--content-secondary)] hover:text-[var(--content-primary)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--surface-border)] bg-[var(--surface-elevated)] text-brand-500 focus:ring-brand-500"
            />
            <span>Remember me for 30 days</span>
          </label>

          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          className="mt-2"
        >
          Sign in
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center text-xs text-[var(--content-secondary)]">
        Don&apos;t have an account yet?{' '}
        <Link
          to={ROUTES.REGISTER}
          className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
        >
          Create account
        </Link>
      </div>
    </Card>
  );
}
