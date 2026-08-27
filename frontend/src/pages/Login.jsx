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
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={{ from }} className="font-semibold text-emerald-400 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {(auth.error || passError) && (
        <div className="mb-4">
          <Banner kind="error">{auth.error || passError}</Banner>
        </div>
      )}

      {auth.ready && auth.providers.length > 0 && (
        <div className="space-y-2.5 mb-4">
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

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400 transition-transform active:scale-95"
          loading={busy}
          disabled={!username.trim() || !password.trim() || busy}
          iconAfter="arrow-right"
        >
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
