// ─── Client-side logger ─────────────────────────────────────────────────────
// Fire-and-forget: never blocks UI, silently ignores failures

const LOG_ENDPOINT = '/api/log';

const send = (entry) => {
  try {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  } catch {}
};

/**
 * Log a structured action.
 * @param {string} familyId
 * @param {string} action - e.g. 'chore.approved', 'login', 'setup.complete'
 * @param {object} detail - additional context
 * @param {{ type: string, id: string, name: string }} [actor] - who performed the action
 * @param {'info'|'warn'|'error'} [level='info']
 */
export const logAction = (familyId, action, detail = {}, actor = null, level = 'info') => {
  send({
    familyId,
    level,
    action,
    actor,
    detail,
    ts: Date.now(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  });
};

/**
 * Log a client-side error.
 */
export const logError = (familyId, error, context = '') => {
  send({
    familyId: familyId || 'unknown',
    level: 'error',
    action: 'client.error',
    actor: null,
    detail: {
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
      context,
    },
    ts: Date.now(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  });
};
