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
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="font-semibold text-emerald-400 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-4">
        <RoleChooser value={role} onChange={setRole} />
      </div>

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
              Sign up with {provider.label}
            </ProviderButton>
          ))}
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400 transition-transform active:scale-95"
          loading={busy}
          disabled={!username.trim() || !password.trim() || busy}
          iconAfter="arrow-right"
        >
          Create {role === 'creator' ? 'creator' : 'user'} account
        </Button>
      </form>
    </AuthShell>
  );
}
