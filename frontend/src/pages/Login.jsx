import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider, ProviderButton } from '../components/auth-ui';
import { Banner, Button, Field } from '../components/ui';
import { useAuth } from '../lib/auth';
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
  const { passwordLogin } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPassError(null);
    setBusy(true);
    try {
      await passwordLogin(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setPassError(err.message || 'Invalid username or password.');
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      headline="Your next session is one click away."
      points={POINTS}
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={{ from }} className="font-semibold text-emerald-800 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-lg text-center">
        <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
        <p className="mt-xs text-sm text-slate-500">
          Enter your ID/Email and password to continue.
        </p>
      </div>

      {(auth.error || passError) && (
        <div className="mb-md">
          <Banner kind="error">{auth.error || passError}</Banner>
        </div>
      )}

      {auth.ready && auth.providers.length > 0 && (
        <div className="space-y-sm mb-md">
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
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-md">
        {auth.providers.length > 0 && <Divider>or sign in with password</Divider>}
        <Field
          label="Username or Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="submit"
          size="lg"
          className="bg-[#164e3d] text-white hover:bg-emerald-800"
          loading={busy}
          disabled={!username.trim() || !password.trim() || busy}
          iconAfter="arrow-right"
        >
          Sign in
        </Button>
      </form>

      {auth.devSignIn && (
        <>
          <Divider>or local dev handle</Divider>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              auth.devLogin().then((destination) => destination && navigate(destination, { replace: true }));
            }}
            className="space-y-md"
          >
            <Field
              label="Dev Handle"
              value={auth.handle}
              onChange={(event) => auth.setHandle(event.target.value)}
              hint="Available while DEV_FAKE_OAUTH=True."
            />
            <Button
              type="submit"
              size="lg"
              variant="outline"
              loading={auth.pending === 'dev'}
              disabled={!auth.handle.trim() || Boolean(auth.pending)}
              iconAfter="arrow-right"
            >
              Quick Dev Sign-in as {auth.handle.trim() || 'user'}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
