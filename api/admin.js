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

// Simple hash for admin password (not bcrypt — serverless-friendly)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(36);
}

// Generate a random token
function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Verify admin token
async function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const session = await kv.get(`app:admin:sessions:${token}`);
  return !!session;
}

// Default admin password (set on first login if none exists)
const DEFAULT_ADMIN_PASSWORD = 'admin1234';

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, ...payload } = req.body;

    // ── Login (no auth required) ──────────────────────────────────────────
    if (action === 'login') {
      const storedHash = await kv.get('app:admin:passwordHash');
      const inputHash = simpleHash(payload.password);

      if (!storedHash) {
        // First-time setup: if password matches default, set it
        if (payload.password === DEFAULT_ADMIN_PASSWORD) {
          await kv.set('app:admin:passwordHash', inputHash);
        } else {
          return res.status(401).json({ error: 'סיסמה שגויה. ברירת המחדל: admin1234' });
        }
      } else if (storedHash !== inputHash) {
        return res.status(401).json({ error: 'סיסמה שגויה' });
      }

      const token = generateToken();
      await kv.set(`app:admin:sessions:${token}`, { createdAt: Date.now() });
      // Session expires in 24 hours
      await kv.expire(`app:admin:sessions:${token}`, 86400);
      return res.json({ token });
    }

    // ── All other actions require auth ────────────────────────────────────
    if (!(await verifyToken(req))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (action) {
      // ── List families ─────────────────────────────────────────────────
      case 'listFamilies': {
        const familyIds = await kv.smembers('app:families');
        const families = [];
        for (const id of familyIds || []) {
          const config = await kv.get(`family:${id}:config`);
          const parentNames = (config?.parents || []).map((p) => p.name).join(' & ');
          families.push({
            id,
            name: config?.familyName || parentNames || 'משפחה חדשה',
            kidsCount: config?.kids?.length || 0,
            isSetup: config?.isSetup || false,
            parents: config?.parents || [],
            kids: (config?.kids || []).map(k => ({ id: k.id, name: k.name, avatar: k.avatar })),
          });
        }
        return res.json({ families });
      }

      // ── Get family detail ─────────────────────────────────────────────
      case 'getFamily': {
        const config = await kv.get(`family:${payload.familyId}:config`);
        const chores = await kv.get(`family:${payload.familyId}:chores`);
        return res.json({ config: config || {}, chores: chores || [] });
      }

      // ── Rename family ─────────────────────────────────────────────────
      case 'renameFamily': {
        if (!payload.familyId || !payload.name) return res.status(400).json({ error: 'Missing familyId or name' });
        const config = await kv.get(`family:${payload.familyId}:config`);
        if (!config) return res.status(404).json({ error: 'Family not found' });
        config.familyName = payload.name;
        await kv.set(`family:${payload.familyId}:config`, config);
        return res.json({ ok: true });
      }

      // ── Delete family ─────────────────────────────────────────────────
      case 'deleteFamily': {
        await kv.del(`family:${payload.familyId}:config`);
        await kv.del(`family:${payload.familyId}:chores`);
        await kv.del(`family:${payload.familyId}:log`);
        await kv.srem('app:families', payload.familyId);
        return res.json({ ok: true });
      }

      // ── Reset PIN ─────────────────────────────────────────────────────
      case 'resetPin': {
        const config = await kv.get(`family:${payload.familyId}:config`);
        if (!config) return res.status(404).json({ error: 'Family not found' });

        if (payload.targetType === 'parent') {
          config.parentPin = payload.newPin;
        } else {
          config.kids = (config.kids || []).map((k) =>
            k.id === payload.targetId ? { ...k, pin: payload.newPin } : k
          );
        }
        await kv.set(`family:${payload.familyId}:config`, config);
        return res.json({ ok: true });
      }

      // ── Delete media (proof image) ────────────────────────────────────
      case 'deleteMedia': {
        const chores = (await kv.get(`family:${payload.familyId}:chores`)) || [];
        const updated = chores.map((c) =>
          c.id === payload.choreId ? { ...c, proofImage: null } : c
        );
        await kv.set(`family:${payload.familyId}:chores`, updated);
        return res.json({ ok: true });
      }

      // ── Change admin password ─────────────────────────────────────────
      case 'changePassword': {
        const storedHash = await kv.get('app:admin:passwordHash');
        if (storedHash && storedHash !== simpleHash(payload.currentPassword)) {
          return res.status(401).json({ error: 'סיסמה נוכחית שגויה' });
        }
        await kv.set('app:admin:passwordHash', simpleHash(payload.newPassword));
        return res.json({ ok: true });
      }

      // ── Invite management (from admin) ────────────────────────────────
      case 'createInvite': {
        const code = generateToken().slice(0, 12);
        const invite = {
          code,
          familyName: payload.familyName,
          createdAt: Date.now(),
          used: false,
          familyId: null,
        };
        await kv.set(`app:invites:${code}`, invite);
        await kv.sadd('app:invites:all', code);
        return res.json({ code, invite });
      }

      case 'listInvites': {
        const codes = await kv.smembers('app:invites:all');
        const invites = [];
        for (const code of codes || []) {
          const inv = await kv.get(`app:invites:${code}`);
          if (inv) invites.push(inv);
        }
        // Sort by creation time, newest first
        invites.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return res.json({ invites });
      }

      case 'revokeInvite': {
        await kv.del(`app:invites:${payload.code}`);
        await kv.srem('app:invites:all', payload.code);
        return res.json({ ok: true });
      }

      // ── User management ────────────────────────────────────────────────
      case 'listUsers': {
        const emails = await kv.smembers('app:users');
        const users = [];
        for (const email of emails || []) {
          const user = await kv.get(`app:users:${email}`);
          if (user) users.push({
            email: user.email,
            name: user.name,
            picture: user.picture,
            provider: user.provider,
            families: user.families || [],
            createdAt: user.createdAt,
          });
        }
        users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return res.json({ users });
      }

      case 'assignUserToFamily': {
        const { email, familyId, name: displayName, role, memberId } = payload;
        if (!email || !familyId) return res.status(400).json({ error: 'Missing email or familyId' });

        const userKey = `app:users:${email.toLowerCase()}`;
        const user = await kv.get(userKey);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get family config for display name and member validation
        const familyConfig = await kv.get(`family:${familyId}:config`);
        const familyName = familyConfig?.familyName || displayName || (familyConfig?.parents || []).map(p => p.name).join(' & ') || familyId;

        // Resolve member name if memberId is provided
        let memberName = '';
        if (memberId && familyConfig) {
          const parent = (familyConfig.parents || []).find(p => p.id === memberId);
          const kid = (familyConfig.kids || []).find(k => k.id === memberId);
          memberName = parent?.name || kid?.name || '';
        }

        // Add family to user's list (avoid duplicates)
        user.families = (user.families || []).filter(f => f.familyId !== familyId);
        user.families.push({
          familyId,
          name: familyName,
          role: role || 'member',
          memberId: memberId || null,       // linked family member profile
          memberName: memberName || null,
        });
        await kv.set(userKey, user);

        return res.json({ ok: true });
      }

      case 'removeUserFromFamily': {
        const { email, familyId } = payload;
        if (!email || !familyId) return res.status(400).json({ error: 'Missing email or familyId' });

        const userKey = `app:users:${email.toLowerCase()}`;
        const user = await kv.get(userKey);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.families = (user.families || []).filter(f => f.familyId !== familyId);
        await kv.set(userKey, user);

        return res.json({ ok: true });
      }

      case 'deleteUser': {
        const { email } = payload;
        if (!email) return res.status(400).json({ error: 'Missing email' });
        await kv.del(`app:users:${email.toLowerCase()}`);
        await kv.srem('app:users', email.toLowerCase());
        return res.json({ ok: true });
      }

      // ── Get logs ──────────────────────────────────────────────────────
      case 'getLogs': {
        const limit = payload.limit || 100;
        if (payload.familyId) {
          const logs = await kv.lrange(`family:${payload.familyId}:log`, 0, limit - 1);
          return res.json({ logs: logs || [] });
        }
        // Global: get logs from all families
        const familyIds = await kv.smembers('app:families');
        let allLogs = [];
        for (const fid of familyIds || []) {
          const logs = await kv.lrange(`family:${fid}:log`, 0, 50);
          allLogs = allLogs.concat(logs || []);
        }
        // Also get global logs
        const globalLogs = await kv.lrange('app:log', 0, 50);
        allLogs = allLogs.concat(globalLogs || []);
        // Sort by timestamp descending and limit
        allLogs.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return res.json({ logs: allLogs.slice(0, limit) });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[API Admin Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
