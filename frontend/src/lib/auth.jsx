import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokens } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await api.get('/auth/me/');
      setUser(me);
      return me;
    } catch {
      tokens.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Complete an OAuth round trip.
   * `role` is only meaningful for a brand-new account — the API ignores it for
   * an existing one, so a returning user cannot be silently promoted.
   */
  const signIn = useCallback(async (provider, code, role) => {
    const data = await api.post(`/auth/${provider}/callback/`, { code, role });
    tokens.set(data);
    setUser(data.user);
    return data;
  }, []);

  const passwordLogin = useCallback(async (username, password) => {
    const data = await api.post('/auth/login/', { username, password });
    tokens.set(data);
    setUser(data.user);
    return data;
  }, []);

  const passwordRegister = useCallback(async (username, email, password, role) => {
    const data = await api.post('/auth/register/', { username, email, password, role });
    tokens.set(data);
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, signIn, passwordLogin, passwordRegister, signOut, reload: loadUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
