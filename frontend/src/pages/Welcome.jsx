import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleChooser } from '../components/auth-ui';
import { FocusLayout } from '../components/Layout';
import { useToast } from '../components/Toast';
import { Avatar, Banner, Button, Card } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RETURN_TO } from '../lib/useOAuthProviders';

/**
 * Onboarding for accounts that arrived without a role choice — someone who
 * signed in from the sign-in page before ever signing up, for instance.
 * `role_chosen` is what routes people here, not `role`, which always has a
 * default and so cannot tell "chose User" from "never asked".
 */
export default function Welcome() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState(user.role || 'user');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patch('/auth/me/', { role });
      setUser(updated);
      toast.success(
        role === 'creator' ? 'Creator account ready' : 'You are all set',
        role === 'creator'
          ? 'Publish your first session from the dashboard.'
          : 'Browse the catalog and book your first session.',
      );
      const destination = sessionStorage.getItem(RETURN_TO) || (role === 'creator' ? '/creator' : '/');
      sessionStorage.removeItem(RETURN_TO);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <FocusLayout>
      <Card className="w-full max-w-xl p-lg shadow-md md:p-xl">
        <div className="mb-lg flex items-center gap-md">
          <Avatar user={user} size={56} />
          <div>
            <p className="text-label-sm uppercase tracking-wider text-primary">
              Welcome to BookSync
            </p>
            <h1 className="text-headline-md text-on-surface">
              Nice to meet you, {(user.display_name || user.username).split(' ')[0]}
            </h1>
          </div>
        </div>

        <p className="mb-lg text-body-md text-on-surface-variant">
          One last thing: how do you plan to use BookSync? This decides what you
          see first — you can change it any time in account settings.
        </p>

        {error && (
          <div className="mb-md">
            <Banner kind="error">{error}</Banner>
          </div>
        )}

        <RoleChooser value={role} onChange={setRole} className="mb-xl" />

        <Button size="lg" onClick={confirm} loading={busy} iconAfter="arrow-right">
          Continue as {role === 'creator' ? 'a creator' : 'a user'}
        </Button>
      </Card>
    </FocusLayout>
  );
}
