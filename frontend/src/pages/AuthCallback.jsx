import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon, { Spinner } from '../components/Icon';
import { FocusLayout } from '../components/Layout';
import { Button, Card } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PENDING_ROLE, RETURN_TO } from '../lib/useOAuthProviders';

const LABELS = { google: 'Google', github: 'GitHub' };

export default function AuthCallback() {
  const { provider = 'google' } = useParams();
  const [params] = useSearchParams();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  // StrictMode mounts effects twice in dev; exchanging the same code twice
  // fails with an invalid-code error and would show a bogus failure.
  const exchanged = useRef(false);
  const label = LABELS[provider] || provider;

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const oauthError = params.get('error');
    if (oauthError) {
      setError(
        oauthError === 'access_denied'
          ? `You cancelled the ${label} sign-in, so nothing was shared with BookSync.`
          : params.get('error_description') || oauthError,
      );
      return;
    }

    const code = params.get('code');
    if (!code) {
      setError(`${label} did not return an authorization code.`);
      return;
    }

    const role = sessionStorage.getItem(PENDING_ROLE) || undefined;

    signIn(provider, code, role)
      .then((result) => {
        sessionStorage.removeItem(PENDING_ROLE);
        const target = sessionStorage.getItem(RETURN_TO) || '/';
        // A brand-new account that never picked a role finishes onboarding
        // before landing anywhere else.
        if (result.created && !result.user.role_chosen) {
          navigate('/welcome', { replace: true });
          return;
        }
        sessionStorage.removeItem(RETURN_TO);
        navigate(target, { replace: true });
      })
      .catch((err) => setError(err.message));
  }, [params, provider, label, signIn, navigate]);

  return (
    <FocusLayout>
      {error ? (
        <Card className="w-full max-w-md border-error-container p-xl text-center shadow-lg animate-fade-in-up">
          <div className="mx-auto mb-lg flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
            <Icon name="alert" size={28} className="text-error" />
          </div>
          <h1 className="mb-sm text-headline-sm text-on-surface">Sign-in failed</h1>
          <p className="mx-auto mb-xl max-w-[300px] text-body-sm text-on-surface-variant">
            {error}
          </p>
          <div className="flex flex-col gap-sm sm:flex-row sm:justify-center">
            <Button as={Link} to="/login" icon="arrow-left">
              Back to sign in
            </Button>
            <Button as={Link} to="/" variant="ghost" icon="compass">
              Browse without an account
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="flex w-full max-w-md flex-col items-center p-xl text-center">
          <Spinner size={44} className="mb-lg text-primary" />
          <h1 className="mb-sm text-headline-sm text-on-surface">Signing you in…</h1>
          <p className="max-w-[260px] text-body-sm text-on-surface-variant">
            Exchanging your {label} authorization code for a BookSync session.
          </p>
        </Card>
      )}
    </FocusLayout>
  );
}
