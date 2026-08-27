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
      <div className="w-full max-w-xl rounded-3xl border border-slate-200/90 bg-white p-8 md:p-10 shadow-2xl animate-fade-in-up">
        <div className="mb-6 flex items-center gap-4">
          <Avatar user={user} size={56} className="ring-2 ring-emerald-600/30" />
          <div>
            <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#164e3d]">
              Welcome to BookSync
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
              Nice to meet you, {(user.display_name || user.username).split(' ')[0]}
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600 leading-relaxed">
          One last thing: how do you plan to use BookSync? This decides what you
          see first — you can change it any time in account settings.
        </p>

        {error && (
          <div className="mb-4">
            <Banner kind="error">{error}</Banner>
          </div>
        )}

        <RoleChooser value={role} onChange={setRole} className="mb-8" />

        <Button
          size="lg"
          onClick={confirm}
          loading={busy}
          className="w-full rounded-xl bg-[#164e3d] py-3.5 text-sm font-bold text-white shadow-xl hover:bg-emerald-800 transition-transform active:scale-95"
          iconAfter="arrow-right"
        >
          Continue as {role === 'creator' ? 'a creator' : 'a user'}
        </Button>
      </div>
    </FocusLayout>
  );
}
