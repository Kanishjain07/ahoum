const ACCESS_KEY = 'ahoum.access';
const REFRESH_KEY = 'ahoum.refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(status, detail, code) {
    super(detail || `Request failed (${status})`);
    this.status = status;
    this.code = code;
  }
}

let refreshInFlight = null;

async function refreshAccessToken() {
  // Collapse parallel 401s into one refresh call, otherwise rotation
  // invalidates the refresh token mid-flight for the other requests.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = tokens.refresh;
      if (!refresh) return false;
      const res = await fetch('/api/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      tokens.set(await res.json());
      return true;
    })().finally(() => {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    });
  }
  return refreshInFlight;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => ({}));

  if (res.status === 401 && retry) {
    if (payload.code === 'token_not_valid' && (await refreshAccessToken())) {
      return request(path, { method, body, retry: false });
    }
    // The token is unusable and cannot be refreshed - revoked, or the account
    // no longer exists. Drop it and retry anonymously so public pages (the
    // catalog, a session page) still render instead of showing an auth error.
    tokens.clear();
    return request(path, { method, body, retry: false });
  }

  if (!res.ok) throw new ApiError(res.status, payload.detail, payload.code);
  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
