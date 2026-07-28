import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { ROUTES } from '../../routes/routes';

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
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

    setTimeout(() => {
      setLoading(false);
      toast.success({
        title: 'Account created!',
        description: 'You can now log in with your credentials.',
      });
      navigate(ROUTES.LOGIN);
    }, 1200);
  };

  return (
    <Card className="w-full bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-elevation-2 p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Create your MailFlow account
        </h2>
        <p className="mt-1.5 text-sm text-[var(--content-secondary)]">
          Start your 14-day free trial. No credit card required.
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
