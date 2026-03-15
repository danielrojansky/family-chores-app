import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper: build Redis key for a family
const configKey = (familyId) => `family:${familyId}:config`;
const choresKey = (familyId) => `family:${familyId}:chores`;

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { type, familyId } = req.query;

      if (!familyId) return res.status(400).json({ error: 'Missing familyId' });

      if (type === 'config') {
        const config = await kv.get(configKey(familyId));
        return res.json(config ?? { isSetup: false, parents: [], kids: [] });
      }

      if (type === 'chores') {
        const chores = await kv.get(choresKey(familyId));
        return res.json(chores ?? []);
      }

      return res.status(400).json({ error: 'Unknown type' });
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { action, familyId, ...payload } = req.body;

      if (!familyId) return res.status(400).json({ error: 'Missing familyId' });

      switch (action) {
        case 'setConfig': {
          await kv.set(configKey(familyId), payload.config);
          // Also register this family in the global set
          await kv.sadd('app:families', familyId);
          return res.json({ ok: true });
        }

        case 'updateConfig': {
          const current = (await kv.get(configKey(familyId))) ?? {};
          await kv.set(configKey(familyId), { ...current, ...payload.patch });
          return res.json({ ok: true });
        }

        case 'addChore': {
          const chores = (await kv.get(choresKey(familyId))) ?? [];
          const newChore = { ...payload.chore, id: 'c' + Date.now() };
          await kv.set(choresKey(familyId), [newChore, ...chores]);
          return res.json(newChore);
        }

        case 'updateChore': {
          const chores = (await kv.get(choresKey(familyId))) ?? [];
          await kv.set(
            choresKey(familyId),
            chores.map((c) => (c.id === payload.id ? { ...c, ...payload.patch } : c))
          );
          return res.json({ ok: true });
        }

        case 'deleteChore': {
          const chores = (await kv.get(choresKey(familyId))) ?? [];
          await kv.set(choresKey(familyId), chores.filter((c) => c.id !== payload.id));
          return res.json({ ok: true });
        }

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API Data Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
