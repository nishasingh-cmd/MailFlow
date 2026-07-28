import { useState, FormEvent, useEffect } from 'react';
import { Card, Input, Button, Avatar, Badge } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        name: name.trim(),
        avatar: avatar.trim() ? avatar.trim() : null,
      });
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      const msg = apiErr.response?.data?.error ?? 'Failed to update profile.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-[var(--content-secondary)]">
          Manage your personal profile and account credentials.
        </p>
      </div>

      <Card header="Profile Details" variant="default">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview Section */}
          <div className="flex items-center gap-5">
            <Avatar name={name || 'User'} src={avatar || undefined} size="xl" online />
            <div className="space-y-1">
              <p className="font-semibold text-base text-[var(--content-primary)]">{user?.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm">
                  Active User
                </Badge>
                <span className="text-xs text-[var(--content-tertiary)]">
                  Joined {formattedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />

            <Input
              label="Email Address"
              value={user?.email ?? ''}
              disabled
              hint="Email address cannot be changed."
            />

            <Input
              label="Avatar Image URL (optional)"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              hint="Direct link to a public profile picture."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
