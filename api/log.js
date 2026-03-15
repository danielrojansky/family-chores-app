import { Redis } from '@upstash/redis';
import { getUserSession } from './_lib/auth.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_LOGS_PER_FAMILY = 1000;
const MAX_GLOBAL_LOGS = 5000;

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const entry = req.body;
    if (!entry || !entry.action) return res.status(400).json({ error: 'Missing log entry' });

    // Verify the user has access to the family they're logging for
    let trusted = false;
    if (entry.familyId) {
      const session = await getUserSession(req, kv);
      trusted = !!(session?.families?.some((f) => f.familyId === entry.familyId));
    }

    // Add server timestamp and trust marker
    entry.serverTs = Date.now();
    entry.trusted = trusted;

    // Store in family-specific log
    if (entry.familyId) {
      const key = `family:${entry.familyId}:log`;
      await kv.lpush(key, entry);
      await kv.ltrim(key, 0, MAX_LOGS_PER_FAMILY - 1);
    }

    // Store in global log
    await kv.lpush('app:log', entry);
    await kv.ltrim('app:log', 0, MAX_GLOBAL_LOGS - 1);

    return res.json({ ok: true });
  } catch (err) {
    // Logging should never crash the app — silently fail
    console.error('[API Log Error]', err);
    return res.json({ ok: false });
  }
}
