import { AUTH_SESSION_KEY } from '../constants';

// ─── Auth token helper ──────────────────────────────────────────────────────
const getAuthToken = () => {
  try { return localStorage.getItem(AUTH_SESSION_KEY) || ''; } catch { return ''; }
};

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Data API (family-scoped) ───────────────────────────────────────────────

export class AuthError extends Error {
  constructor(status, message) { super(message); this.status = status; this.name = 'AuthError'; }
}

export const fetcher = (url) =>
  fetch(url, { headers: authHeaders() })
    .then((r) => {
      if (r.status === 401 || r.status === 403) throw new AuthError(r.status, 'Authentication required');
      if (!r.ok) throw new Error('API error');
      return r.json();
    });

export const apiCall = async (action, payload = {}) => {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

// ─── Admin API ──────────────────────────────────────────────────────────────

export const adminCall = async (action, payload = {}, token = '') => {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
};

// ─── Invite API ─────────────────────────────────────────────────────────────

export const inviteCall = async (action, payload = {}) => {
  const method = action === 'getInvite' ? 'GET' : 'POST';
  const url = method === 'GET'
    ? `/api/invite?code=${encodeURIComponent(payload.code)}`
    : '/api/invite';

  const res = await fetch(url, {
    method,
    ...(method === 'POST' ? {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
};

// ─── WebAuthn API ───────────────────────────────────────────────────────────

export const webauthnCall = async (action, payload = {}, token = '') => {
  const res = await fetch('/api/webauthn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `WebAuthn error ${res.status}`);
  }
  return res.json();
};

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authCall = async (action, payload = {}) => {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
};

export const authGet = async (action) => {
  const res = await fetch(`/api/auth?action=${action}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
};
