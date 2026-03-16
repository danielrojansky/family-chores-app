import { Redis } from '@upstash/redis';
import { getUserSession } from './_lib/auth.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        type: invite.type || 'create',
        familyId: invite.familyId || null,
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

      // ── Require authentication — must know who is joining ──────────────
      const session = await getUserSession(req, kv);
      if (!session) return res.status(401).json({ error: 'יש להתחבר לפני קבלת הזמנה' });

      let familyId;
      let familyName = invite.familyName || 'המשפחה שלי';

      if (invite.type === 'join' && invite.familyId) {
        // ── Join existing family ──────────────────────────────────────────
        familyId = invite.familyId;
        const existing = await kv.get(`family:${familyId}:config`);
        if (!existing) return res.status(404).json({ error: 'Family no longer exists' });
        familyName = existing.familyName || invite.familyName || 'המשפחה שלי';
      } else {
        // ── Create new family ─────────────────────────────────────────────
        if (!config) return res.status(400).json({ error: 'Missing config for new family' });
        familyId = generateFamilyId();
        if (!config.familyName) config.familyName = invite.familyName || 'המשפחה שלי';
        await kv.set(`family:${familyId}:config`, config);
        await kv.set(`family:${familyId}:chores`, []);
        await kv.sadd('app:families', familyId);
      }

      // ── Add family to user's families array ─────────────────────────────
      const userKey = `app:users:${session.email}`;
      const user = await kv.get(userKey);
      if (user) {
        const alreadyMember = (user.families || []).some((f) => f.familyId === familyId);
        if (!alreadyMember) {
          user.families = [...(user.families || []), {
            familyId,
            name: familyName,
            role: 'member',
            joinedAt: Date.now(),
          }];
          await kv.set(userKey, user);
        }
      }

      // ── Mark invite as used ─────────────────────────────────────────────
      invite.used = true;
      invite.familyId = familyId;
      invite.usedAt = Date.now();
      invite.usedBy = session.email;
      await kv.set(`app:invites:${code}`, invite);

      return res.json({ familyId, familyName, type: invite.type || 'create' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API Invite Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
