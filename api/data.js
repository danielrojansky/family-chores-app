import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { type } = req.query;

      if (type === 'config') {
        const config = await kv.get('config');
        return res.json(config ?? { isSetup: false, parents: [], kids: [] });
      }

      if (type === 'chores') {
        const chores = await kv.get('chores');
        return res.json(chores ?? []);
      }

      return res.status(400).json({ error: 'Unknown type' });
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { action, ...payload } = req.body;

      switch (action) {
        case 'setConfig': {
          await kv.set('config', payload.config);
          return res.json({ ok: true });
        }

        case 'updateConfig': {
          const current = (await kv.get('config')) ?? {};
          await kv.set('config', { ...current, ...payload.patch });
          return res.json({ ok: true });
        }

        case 'addChore': {
          const chores = (await kv.get('chores')) ?? [];
          const newChore = { ...payload.chore, id: 'c' + Date.now() };
          await kv.set('chores', [newChore, ...chores]);
          return res.json(newChore);
        }

        case 'updateChore': {
          const chores = (await kv.get('chores')) ?? [];
          await kv.set(
            'chores',
            chores.map((c) => (c.id === payload.id ? { ...c, ...payload.patch } : c))
          );
          return res.json({ ok: true });
        }

        case 'deleteChore': {
          const chores = (await kv.get('chores')) ?? [];
          await kv.set('chores', chores.filter((c) => c.id !== payload.id));
          return res.json({ ok: true });
        }

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
