import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleMark } from '../components/auth-ui';
import Icon from '../components/Icon';
import Layout, { PageHeader } from '../components/Layout';
import { useToast } from '../components/Toast';
import { Avatar, Badge, Banner, Button, Card, Field } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    display_name: user.display_name || '',
    bio: user.bio || '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/bookings/?scope=active'), api.get('/bookings/?scope=past')])
      .then(([active, past]) => setCounts({ active: active.count, past: past.count }))
      .catch(() => setCounts(null));
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setUser(await api.patch('/auth/me/', form));
      toast.success('Profile saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function switchRole() {
    const next = user.role === 'creator' ? 'user' : 'creator';
    setSwitching(true);
    setError(null);
    try {
      setUser(await api.patch('/auth/me/', { role: next }));
      toast.success(
        next === 'creator' ? 'You are now a creator' : 'Switched back to a user account',
        next === 'creator' ? 'The creator dashboard is now in your navigation.' : undefined,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSwitching(false);
    }
  }

  const isCreator = user.role === 'creator';
  const isGoogle = user.oauth_provider === 'google';
  const providerLabel = isGoogle ? 'Google' : 'GitHub';

  return (
    <Layout>
      <PageHeader
        title="Account settings"
        subtitle="Manage your profile information and role."
        actions={
          <Card className="flex w-fit items-center gap-sm p-xs">
            <span className="px-sm py-1 text-label-sm text-on-surface-variant">Current role:</span>
            <Badge tone="secondary" icon={isCreator ? 'dashboard' : 'user'}>
              {isCreator ? 'Creator' : 'User'}
            </Badge>
            <Button
              size="sm"
              onClick={switchRole}
              loading={switching}
              icon="arrow-right"
              title={
                isCreator
                  ? 'Only possible while you own no sessions.'
                  : 'Creators can publish sessions.'
              }
            >
              {isCreator ? 'Switch to user' : 'Switch to creator'}
            </Button>
          </Card>
        }
      />

      {error && (
        <div className="mb-lg">
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
        {/* Left: identity, straight from the OAuth provider */}
        <div className="flex flex-col gap-gutter md:col-span-4">
          <Card className="flex flex-col items-center p-lg text-center">
            <div className="relative mb-md">
              <Avatar user={user} size={112} className="relative z-10 shadow-sm" />
              <div className="absolute inset-0 scale-110 rounded-full bg-primary/10 blur-md" />
            </div>
            <h2 className="mb-xs text-headline-sm text-on-surface">
              {user.display_name || user.username}
            </h2>
            <p className="mb-md flex items-center justify-center gap-xs text-body-sm text-on-surface-variant">
              <Icon name="mail" size={16} />
              {user.email || 'no email shared'}
            </p>
            <div className="mt-auto flex w-full items-center justify-between rounded-lg bg-surface-container-high/50 p-sm">
              <span className="text-label-sm text-on-surface-variant">Linked account</span>
              <span className="flex items-center gap-xs text-label-sm text-on-surface">
                {isGoogle ? <GoogleMark size={16} /> : <Icon name="github" size={16} />}
                {providerLabel}
              </span>
            </div>
          </Card>

          <Card className="p-lg">
            <h3 className="mb-md flex items-center gap-xs text-label-md text-on-surface">
              <Icon name="calendar" size={18} className="text-primary" />
              Your activity
            </h3>
            <ul className="space-y-sm text-body-sm">
              <li className="flex items-center justify-between">
                <span className="text-on-surface-variant">Active bookings</span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-md text-on-surface">
                  {counts ? counts.active : '—'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-on-surface-variant">Past &amp; cancelled</span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-md text-on-surface">
                  {counts ? counts.past : '—'}
                </span>
              </li>
            </ul>
            {isCreator && (
              <Button
                as={Link}
                to="/creator"
                variant="ghost"
                size="sm"
                className="mt-md"
                iconAfter="arrow-right"
              >
                Open creator dashboard
              </Button>
            )}
          </Card>
        </div>

        {/* Right: the parts the user actually owns */}
        <div className="md:col-span-8">
          <Card className="p-lg md:p-xl">
            <div className="mb-lg flex items-center justify-between border-b border-surface-variant pb-md">
              <h2 className="text-headline-sm text-on-surface">Personal information</h2>
            </div>

            <form onSubmit={save} className="space-y-lg">
              <Field
                label="Display name"
                value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              />
              <Field
                as="textarea"
                rows="4"
                label="Bio"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                hint="Shown to attendees on your session pages."
              />

              <div className="rounded-lg border border-surface-variant bg-surface-container-low p-md">
                <p className="flex items-center gap-xs text-label-md text-on-surface">
                  <Icon name="lock" size={16} className="text-primary" />
                  Managed by {providerLabel}
                </p>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Your username, email and avatar come from {providerLabel} and refresh on
                  each sign-in. Role changes are enforced by the API on every request, not by
                  this page.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={busy} icon="check">
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
