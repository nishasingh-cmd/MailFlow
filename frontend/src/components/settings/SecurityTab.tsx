import { useState } from 'react';
import { settingsService } from '../../services/settings.service';
import { useToast } from '../../hooks/useToast';
import { Button, Input } from '../ui';

function getPasswordStrength(password: string): {
  label: string;
  percentage: number;
  color: string;
} {
  if (!password) return { label: 'None', percentage: 0, color: 'bg-[var(--surface-border)]' };
  if (password.length < 6) return { label: 'Weak', percentage: 25, color: 'bg-red-500' };

  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;

  if (score <= 50) return { label: 'Fair', percentage: 50, color: 'bg-amber-500' };
  if (score <= 75) return { label: 'Good', percentage: 75, color: 'bg-blue-500' };
  return { label: 'Strong', percentage: 100, color: 'bg-green-500' };
}

export function SecurityTab() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation password do not match.');
      return;
    }

    setSaving(true);
    try {
      await settingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success('🔒 Security password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-[var(--content-primary)]">
          Security & Authentication
        </h3>
        <p className="text-xs text-[var(--content-secondary)] mt-0.5">
          Update your account password and manage authentication security settings.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-elevation-1">
        <Input
          id="current-password"
          label="Current Password *"
          type="password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <div className="space-y-2">
          <Input
            id="new-password"
            label="New Password *"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          {/* Password Strength Meter */}
          {newPassword && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-2xs">
                <span className="text-[var(--content-tertiary)]">Password Strength:</span>
                <span className="font-semibold text-[var(--content-primary)]">
                  {strength.label}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Input
          id="confirm-password"
          label="Confirm New Password *"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <div className="flex justify-end pt-4 border-t border-[var(--surface-border)]">
          <Button
            variant="primary"
            onClick={handlePasswordChange}
            loading={saving}
            disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}
