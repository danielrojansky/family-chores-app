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

// Generate short family ID
function generateFamilyId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: validate invite ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const { code } = req.query;
      if (!code) return res.status(400).json({ error: 'Missing code' });

      const invite = await kv.get(`app:invites:${code}`);
      if (!invite) return res.status(404).json({ error: 'Invite not found' });

      return res.json({
        familyName: invite.familyName,
        used: invite.used || false,
        createdAt: invite.createdAt,
        type: invite.type || 'create',       // 'create' = new family, 'join' = existing
        familyId: invite.familyId || null,    // set for 'join' invites
      });
    }

    // ── POST: accept invite ───────────────────────────────────────────────
    if (req.method === 'POST') {
      const { action, code, config } = req.body;

      if (action !== 'accept') return res.status(400).json({ error: 'Unknown action' });
      if (!code) return res.status(400).json({ error: 'Missing code' });

      const invite = await kv.get(`app:invites:${code}`);
      if (!invite) return res.status(404).json({ error: 'Invite not found' });
      if (invite.used) return res.status(400).json({ error: 'Invite already used' });

      let familyId;

      if (invite.type === 'join' && invite.familyId) {
        // ── Join existing family — no setup needed ──────────────────────
        familyId = invite.familyId;
        // Verify family still exists
        const existing = await kv.get(`family:${familyId}:config`);
        if (!existing) return res.status(404).json({ error: 'Family no longer exists' });
      } else {
        // ── Create new family — requires config ─────────────────────────
        if (!config) return res.status(400).json({ error: 'Missing config for new family' });
        familyId = generateFamilyId();
        await kv.set(`family:${familyId}:config`, config);
        await kv.set(`family:${familyId}:chores`, []);
        await kv.sadd('app:families', familyId);
      }

      // Mark invite as used
      invite.used = true;
      invite.familyId = familyId;
      invite.usedAt = Date.now();
      await kv.set(`app:invites:${code}`, invite);

      return res.json({ familyId, type: invite.type || 'create' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API Invite Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
