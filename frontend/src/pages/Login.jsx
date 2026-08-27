import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider, ProviderButton } from '../components/auth-ui';
import { Banner, Button, Field } from '../components/ui';
import { useOAuthProviders } from '../lib/useOAuthProviders';

const POINTS = [
  {
    icon: 'ticket',
    title: 'One seat, one booking',
    body: 'Capacity is settled in the database, not in the browser.',
  },
  {
    icon: 'calendar-check',
    title: 'Everything in one place',
    body: 'Upcoming and past sessions, cancellations included.',
  },
];

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/';
  const auth = useOAuthProviders({ from });

  return (
    <AuthShell
      eyebrow="Welcome back"
      headline="Your next session is one click away."
      points={POINTS}
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={{ from }} className="text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-lg text-center">
        <h2 className="text-headline-md text-on-surface">Sign in</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Continue with the account you signed up with.
        </p>
      </div>

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
            Continue with {provider.label}
          </ProviderButton>
        ))}
      </div>

      {auth.devSignIn && (
        <>
          <Divider>or local dev sign-in</Divider>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              auth.devLogin().then((destination) => destination && navigate(destination, { replace: true }));
            }}
            className="space-y-md"
          >
            <Field
              label="Handle"
              value={auth.handle}
              onChange={(event) => auth.setHandle(event.target.value)}
              hint="Available while DEV_FAKE_OAUTH=True. Reuses the account if it exists."
            />
            <Button
              type="submit"
              size="lg"
              variant="outline"
              loading={auth.pending === 'dev'}
              disabled={!auth.handle.trim() || Boolean(auth.pending)}
              iconAfter="arrow-right"
            >
              Sign in as {auth.handle.trim() || '…'}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
