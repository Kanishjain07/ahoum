import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider, ProviderButton, RoleChooser } from '../components/auth-ui';
import Icon from '../components/Icon';
import { Banner, Button, Field } from '../components/ui';
import { useOAuthProviders } from '../lib/useOAuthProviders';

const POINTS = [
  {
    icon: 'compass',
    title: 'Browse a live catalog',
    body: 'Real seat counts, updated the moment someone books.',
  },
  {
    icon: 'dashboard',
    title: 'Or host your own',
    body: 'Set capacity, publish, and watch the roster fill up.',
  },
  {
    icon: 'lock',
    title: 'Sign in with an account you already have',
    body: 'Google or GitHub. No password to remember or lose.',
  },
];

export default function Signup() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/';
  const [role, setRole] = useState('user');
  const auth = useOAuthProviders({ from, role });

  return (
    <AuthShell
      eyebrow="Create your account"
      headline="Book it, or host it."
      points={POINTS}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-lg">
        <h2 className="text-headline-md text-on-surface">Get started</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          First, how do you want to use BookSync? You can change this later.
        </p>
      </div>

      <RoleChooser value={role} onChange={setRole} className="mb-lg" />

      {auth.error && (
        <div className="mb-md">
          <Banner kind="error">{auth.error}</Banner>
        </div>
      )}

      {auth.ready && auth.providers.length === 0 && (
        <Banner kind="info" title="No OAuth provider configured">
          Add GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID to .env to enable
          single sign-on. The dev sign-in below works either way.
        </Banner>
      )}

      <div className="space-y-sm">
        {auth.providers.map((provider) => (
          <ProviderButton
            key={provider.key}
            provider={provider.key}
            busy={auth.pending === provider.key}
            disabled={Boolean(auth.pending)}
            onClick={() => auth.startOAuth(provider.key)}
          >
            Sign up with {provider.label}
          </ProviderButton>
        ))}
      </div>

      {auth.devSignIn && (
        <>
          <Divider>or local dev sign-up</Divider>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              auth
                .devLogin()
                .then((destination) => destination && navigate(destination, { replace: true }));
            }}
            className="space-y-md"
          >
            <Field
              label="Handle"
              value={auth.handle}
              onChange={(event) => auth.setHandle(event.target.value)}
              hint="Available while DEV_FAKE_OAUTH=True. Creates the account if it is new."
            />
            <Button
              type="submit"
              size="lg"
              variant="outline"
              loading={auth.pending === 'dev'}
              disabled={!auth.handle.trim() || Boolean(auth.pending)}
              iconAfter="arrow-right"
            >
              Create {role === 'creator' ? 'creator' : 'user'} account
            </Button>
          </form>
        </>
      )}

      <p className="mt-lg flex items-start gap-xs text-label-sm text-on-surface-variant">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Your role is applied when the account is created. Sending it again later
        will not change an existing account — the API only honours it on sign-up.
      </p>
    </AuthShell>
  );
}
