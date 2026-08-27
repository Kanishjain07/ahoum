import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, Divider, ProviderButton, RoleChooser } from '../components/auth-ui';
import Icon from '../components/Icon';
import { Banner, Button, Field } from '../components/ui';
import { useAuth } from '../lib/auth';
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
    body: 'Google or GitHub. Password or OAuth.',
  },
];

export default function Signup() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/';
  const [role, setRole] = useState('user');
  const auth = useOAuthProviders({ from, role });
  const { passwordRegister } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPassError(null);
    setBusy(true);
    try {
      await passwordRegister(username, email, password, role);
      navigate(from, { replace: true });
    } catch (err) {
      setPassError(err.message || 'Registration failed.');
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create your account"
      headline="Book it, or host it."
      points={POINTS}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="font-semibold text-emerald-800 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-lg">
        <h2 className="text-2xl font-bold text-slate-900">Get started</h2>
        <p className="mt-xs text-sm text-slate-500">
          First, how do you want to use BookSync? You can change this later.
        </p>
      </div>

      <RoleChooser value={role} onChange={setRole} className="mb-lg" />

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
              Sign up with {provider.label}
            </ProviderButton>
          ))}
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-md">
        {auth.providers.length > 0 && <Divider>or sign up with password</Divider>}
        <Field
          label="Username / ID"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Field
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Create {role === 'creator' ? 'creator' : 'user'} account
        </Button>
      </form>

      {auth.devSignIn && (
        <>
          <Divider>or local dev handle</Divider>
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

      <p className="mt-lg flex items-start gap-xs text-xs text-slate-500">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Your role is applied when the account is created. Sending it again later
        will not change an existing account.
      </p>
    </AuthShell>
  );
}
