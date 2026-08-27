import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';

export const PENDING_ROLE = 'booksync.pendingRole';
export const RETURN_TO = 'booksync.returnTo';

/**
 * Shared plumbing for the sign-in and sign-up screens: which providers the
 * server actually has configured, the redirect handshake, and the dev
 * sign-in shortcut.
 *
 * `role` is passed through to the callback, where the API applies it only if
 * the account is being created.
 */
export function useOAuthProviders({ from = '/', role } = {}) {
  const [providers, setProviders] = useState([]);
  const [devSignIn, setDevSignIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [handle, setHandle] = useState('demo-user');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/auth/providers/')
      .then((data) => {
        // Return all providers so Google and GitHub buttons are always visible on the card
        const allProviders = data.providers.length > 0 ? data.providers : [
          { key: 'google', label: 'Google', configured: false },
          { key: 'github', label: 'GitHub', configured: false },
        ];
        setProviders(allProviders);
        setDevSignIn(data.dev_sign_in);
      })
      .catch(() => {
        // Fallback default providers if backend error
        setProviders([
          { key: 'google', label: 'Google', configured: false },
          { key: 'github', label: 'GitHub', configured: false },
        ]);
      })
      .finally(() => setReady(true));
  }, []);

  const startOAuth = useCallback(
    async (providerKey) => {
      setPending(providerKey);
      setError(null);
      try {
        const { url } = await api.get(`/auth/${providerKey}/login-url/`);
        sessionStorage.setItem(RETURN_TO, from);
        if (role) sessionStorage.setItem(PENDING_ROLE, role);
        else sessionStorage.removeItem(PENDING_ROLE);
        window.location.assign(url);
      } catch (err) {
        setError(
          err.code === 'oauth_unconfigured'
            ? `${providerKey} sign-in is not configured on this server.`
            : err.message,
        );
        setPending(null);
      }
    },
    [from, role],
  );

  /** Returns the route to go to next, or null when it failed. */
  const devLogin = useCallback(async () => {
    setPending('dev');
    setError(null);
    try {
      // The provider is irrelevant for the dev path, but it still travels
      // through the same view, so pick one the server knows.
      const result = await signIn('google', `dev:${handle.trim()}`, role);
      return result.created && !result.user.role_chosen ? '/welcome' : from;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setPending(null);
    }
  }, [from, handle, role, signIn]);

  return {
    providers,
    ready,
    devSignIn,
    handle,
    setHandle,
    pending,
    error,
    setError,
    startOAuth,
    devLogin,
    navigate,
  };
}
