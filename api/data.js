import { Redis } from '@upstash/redis';
import { generateInviteCode } from './_lib/security.js';
import { requireFamilyAccess, getUserSession, getValidInvite } from './_lib/auth.js';
import { checkLimit, pinLimiter } from './_lib/rateLimit.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const configKey = (familyId) => `family:${familyId}:config`;
const choresKey = (familyId) => `family:${familyId}:chores`;

// ─── Input validation ─────────────────────────────────────────────────────────
function sanitizeString(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_SECONDS = 600; // 10 minutes

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: read family data ─────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { type, familyId } = req.query;
      if (!familyId) return res.status(400).json({ error: 'Missing familyId' });

      // Authorization: user must belong to this family
      const access = await requireFamilyAccess(req, res, kv, familyId);
      if (!access) return; // response already sent

      if (type === 'config') {
        const config = await kv.get(configKey(familyId));
        // Strip sensitive fields before sending to client
        if (config) {
          const safe = { ...config };
          // Don't send PIN values in config — PIN validation is server-side now
          // PINs are still stored for PIN validation action, but masked here
          if (safe.parentPin) safe.parentPin = '****';
          if (safe.kids) safe.kids = safe.kids.map((k) => ({ ...k, pin: k.pin ? '****' : '' }));
          return res.json(safe);
        }
        return res.json({ isSetup: false, parents: [], kids: [] });
      }

      if (type === 'chores') {
        const chores = await kv.get(choresKey(familyId));
        return res.json(chores ?? []);
      }

      return res.status(400).json({ error: 'Unknown type' });
    }

    // ── POST: mutate family data ──────────────────────────────────────────────
    if (req.method === 'POST') {
      const { action, familyId, ...payload } = req.body;
      if (!familyId) return res.status(400).json({ error: 'Missing familyId' });

      // ── setConfig: family creation from invite — special authorization ──────
      if (action === 'setConfig') {
        // Allow if: (a) user is already in this family, OR (b) valid unused invite covers this familyId
        const session = await getUserSession(req, kv);
        const alreadyMember = session?.families?.some((f) => f.familyId === familyId);
        if (!alreadyMember) {
          // Check for valid invite code
          const invite = await getValidInvite(kv, payload.inviteCode);
          // For 'create' type invites, familyId won't match until after creation
          if (!invite) return res.status(403).json({ error: 'Valid invite required to create family' });
        }

        if (!payload.config || typeof payload.config !== 'object') {
          return res.status(400).json({ error: 'Invalid config' });
        }
        await kv.set(configKey(familyId), payload.config);
        await kv.sadd('app:families', familyId);
        return res.json({ ok: true });
      }

      // ── validatePin: server-side PIN check with rate limiting ───────────────
      if (action === 'validatePin') {
        const { profileId, pin, type } = payload;
        if (!profileId || !pin) return res.status(400).json({ error: 'Missing profileId or pin' });

        // Rate limit by family+profile combo
        const rlKey = `${familyId}:${profileId}`;
        if (await checkLimit(pinLimiter, rlKey, res)) return;

        // Check lockout
        const lockoutKey = `pin:locked:${familyId}:${profileId}`;
        const lockedUntil = await kv.get(lockoutKey);
        if (lockedUntil) {
          const remaining = Math.ceil((Number(lockedUntil) - Date.now()) / 1000);
          return res.status(429).json({ ok: false, locked: true, lockedSeconds: Math.max(0, remaining) });
        }

        // Fetch config (no auth needed — this is the auth mechanism itself)
        const config = await kv.get(configKey(familyId));
        if (!config) return res.status(404).json({ error: 'Family not found' });

        let correctPin = null;
        if (type === 'parent') {
          correctPin = config.parentPin;
        } else {
          const kid = (config.kids || []).find((k) => k.id === profileId);
          correctPin = kid?.pin;
        }

        // Track attempts
        const attemptsKey = `pin:attempts:${familyId}:${profileId}`;
        if (pin === correctPin || (!correctPin && pin === '')) {
          // Success — clear attempts
          await kv.del(attemptsKey);
          return res.json({ ok: true });
        }

        // Failed attempt
        const attempts = await kv.incr(attemptsKey);
        if (attempts === 1) await kv.expire(attemptsKey, PIN_LOCKOUT_SECONDS);
        const attemptsLeft = Math.max(0, PIN_MAX_ATTEMPTS - attempts);

        if (attempts >= PIN_MAX_ATTEMPTS) {
          const lockedUntilTs = Date.now() + PIN_LOCKOUT_SECONDS * 1000;
          await kv.set(lockoutKey, lockedUntilTs.toString());
          await kv.expire(lockoutKey, PIN_LOCKOUT_SECONDS);
          await kv.del(attemptsKey);
          return res.json({ ok: false, locked: true, lockedSeconds: PIN_LOCKOUT_SECONDS, attemptsLeft: 0 });
        }

        return res.json({ ok: false, locked: false, attemptsLeft });
      }

      // ── All other mutations require family membership ──────────────────────
      const access = await requireFamilyAccess(req, res, kv, familyId);
      if (!access) return;

      switch (action) {
        case 'updateConfig': {
          if (!payload.patch || typeof payload.patch !== 'object') {
            return res.status(400).json({ error: 'Invalid patch' });
          }
          const current = (await kv.get(configKey(familyId))) ?? {};
          await kv.set(configKey(familyId), { ...current, ...payload.patch });
          return res.json({ ok: true });
        }

        case 'addChore': {
          const chore = payload.chore;
          if (!chore?.title) return res.status(400).json({ error: 'Missing chore title' });
          const chores = (await kv.get(choresKey(familyId))) ?? [];
          const newChore = {
            ...chore,
            id: 'c' + Date.now(),
            title: sanitizeString(chore.title, 100),
            reward: Math.min(Math.max(0, Number(chore.reward) || 0), 99999),
          };
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

        // ── Parent-generated join invite ─────────────────────────────────────
        case 'createFamilyInvite': {
          const config = await kv.get(configKey(familyId));
          const familyName = config?.familyName
            || (config?.parents || []).map((p) => p.name).join(' & ')
            || familyId;
          const code = generateInviteCode();
          const invite = {
            code,
            familyName,
            familyId,
            type: 'join',
            createdBy: sanitizeString(payload.createdBy || 'parent', 20),
            createdAt: Date.now(),
            used: false,
          };
          await kv.set(`app:invites:${code}`, invite);
          await kv.sadd('app:invites:all', code);
          return res.json({ code, invite });
        }

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API Data Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
