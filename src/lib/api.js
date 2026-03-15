// ─── Data API (family-scoped) ───────────────────────────────────────────────

export const fetcher = (url) =>
  fetch(url).then((r) => { if (!r.ok) throw new Error('API error'); return r.json(); });

export const apiCall = async (action, payload = {}) => {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
