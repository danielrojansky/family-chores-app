import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword, generateToken } from './_lib/security.js';
import { verifyAdminSession } from './_lib/auth.js';
import { checkLimit, loginLimiter } from './_lib/rateLimit.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Admin session creation ───────────────────────────────────────────────────
async function createAdminSession(req) {
  const token = generateToken(32);
  const now = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const session = {
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24h
    ip,
    userAgent: req.headers['user-agent'] || '',
  };
  await kv.set(`app:admin:sessions:${token}`, session);
  await kv.expire(`app:admin:sessions:${token}`, 86400);
  await kv.sadd('app:admin:sessions:all', token);
  return token;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, ...payload } = req.body;

    // ── Login (no auth required) ───────────────────────────────────────────
    if (action === 'login') {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      if (await checkLimit(loginLimiter, `admin:${ip}`, res)) return;

      const storedHash = await kv.get('app:admin:passwordHash');
      const { password } = payload;

      if (!storedHash) {
        // First-run: require ADMIN_SETUP_KEY environment variable
        const setupKey = process.env.ADMIN_SETUP_KEY;
        if (!setupKey || payload.setupKey !== setupKey) {
          return res.status(401).json({ error: 'סיסמה שגויה' });
        }
        // Set the new password as the admin password
        await kv.set('app:admin:passwordHash', await hashPassword(password));
      } else {
        const valid = await verifyPassword(password, storedHash);
        if (!valid) return res.status(401).json({ error: 'סיסמה שגויה' });

        // Transparent migration from legacy hash
        if (storedHash.startsWith('h_')) {
          await kv.set('app:admin:passwordHash', await hashPassword(password));
        }
      }

      const token = await createAdminSession(req);
      return res.json({ token });
    }

    // ── All other actions require valid admin session ───────────────────────
    if (!(await verifyAdminSession(req, kv))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (action) {
      // ── Families ──────────────────────────────────────────────────────────
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
            kids: (config?.kids || []).map((k) => ({ id: k.id, name: k.name, avatar: k.avatar })),
          });
        }
        return res.json({ families });
      }

      case 'getFamily': {
        const config = await kv.get(`family:${payload.familyId}:config`);
        const chores = await kv.get(`family:${payload.familyId}:chores`);
        return res.json({ config: config || {}, chores: chores || [] });
      }

      case 'renameFamily': {
        if (!payload.familyId || !payload.newName) return res.status(400).json({ error: 'Missing familyId or newName' });
        const config = await kv.get(`family:${payload.familyId}:config`);
        if (!config) return res.status(404).json({ error: 'Family not found' });
        config.familyName = payload.newName.trim().slice(0, 50);
        await kv.set(`family:${payload.familyId}:config`, config);
        return res.json({ ok: true });
      }

      case 'deleteFamily': {
        await kv.del(`family:${payload.familyId}:config`);
        await kv.del(`family:${payload.familyId}:chores`);
        await kv.del(`family:${payload.familyId}:log`);
        await kv.srem('app:families', payload.familyId);
        return res.json({ ok: true });
      }

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

      case 'deleteMedia': {
        const chores = (await kv.get(`family:${payload.familyId}:chores`)) || [];
        const updated = chores.map((c) =>
          c.id === payload.choreId ? { ...c, proofImage: null } : c
        );
        await kv.set(`family:${payload.familyId}:chores`, updated);
        return res.json({ ok: true });
      }

      // ── Admin password ─────────────────────────────────────────────────────
      case 'changePassword': {
        const storedHash = await kv.get('app:admin:passwordHash');
        if (storedHash) {
          const valid = await verifyPassword(payload.currentPassword, storedHash);
          if (!valid) return res.status(401).json({ error: 'סיסמה נוכחית שגויה' });
        }
        if (!payload.newPassword || payload.newPassword.length < 8) {
          return res.status(400).json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' });
        }
        await kv.set('app:admin:passwordHash', await hashPassword(payload.newPassword));
        return res.json({ ok: true });
      }

      // ── Session management ─────────────────────────────────────────────────
      case 'listSessions': {
        const tokens = await kv.smembers('app:admin:sessions:all');
        const sessions = [];
        for (const tok of tokens || []) {
          const s = await kv.get(`app:admin:sessions:${tok}`);
          if (s) {
            sessions.push({ token: tok.slice(0, 8) + '...', ...s });
          } else {
            // Clean up expired token from set
            await kv.srem('app:admin:sessions:all', tok);
          }
        }
        sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return res.json({ sessions });
      }

      case 'revokeSession': {
        const { sessionToken } = payload;
        if (!sessionToken) return res.status(400).json({ error: 'Missing sessionToken' });
        await kv.del(`app:admin:sessions:${sessionToken}`);
        await kv.srem('app:admin:sessions:all', sessionToken);
        return res.json({ ok: true });
      }

      case 'revokeAllSessions': {
        const tokens = await kv.smembers('app:admin:sessions:all');
        for (const tok of tokens || []) await kv.del(`app:admin:sessions:${tok}`);
        await kv.del('app:admin:sessions:all');
        return res.json({ ok: true });
      }

      // ── Invite management ──────────────────────────────────────────────────
      case 'createInvite': {
        const { generateInviteCode } = await import('./_lib/security.js');
        const code = generateInviteCode();
        const invite = {
          code,
          familyName: payload.familyName?.trim().slice(0, 50) || '',
          type: 'create',
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
        invites.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return res.json({ invites });
      }

      case 'revokeInvite': {
        await kv.del(`app:invites:${payload.code}`);
        await kv.srem('app:invites:all', payload.code);
        return res.json({ ok: true });
      }

      // ── User management ────────────────────────────────────────────────────
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
        const familyConfig = await kv.get(`family:${familyId}:config`);
        const familyName = familyConfig?.familyName || displayName
          || (familyConfig?.parents || []).map((p) => p.name).join(' & ') || familyId;
        let memberName = '';
        if (memberId && familyConfig) {
          const parent = (familyConfig.parents || []).find((p) => p.id === memberId);
          const kid = (familyConfig.kids || []).find((k) => k.id === memberId);
          memberName = parent?.name || kid?.name || '';
        }
        user.families = (user.families || []).filter((f) => f.familyId !== familyId);
        user.families.push({
          familyId, name: familyName, role: role || 'member',
          memberId: memberId || null, memberName: memberName || null,
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
        user.families = (user.families || []).filter((f) => f.familyId !== familyId);
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

      // ── Logs ──────────────────────────────────────────────────────────────
      case 'getLogs': {
        const limit = Math.min(payload.limit || 100, 500);
        if (payload.familyId) {
          const logs = await kv.lrange(`family:${payload.familyId}:log`, 0, limit - 1);
          return res.json({ logs: logs || [] });
        }
        const familyIds = await kv.smembers('app:families');
        let allLogs = [];
        for (const fid of familyIds || []) {
          const logs = await kv.lrange(`family:${fid}:log`, 0, 50);
          allLogs = allLogs.concat(logs || []);
        }
        const globalLogs = await kv.lrange('app:log', 0, 50);
        allLogs = allLogs.concat(globalLogs || []);
        allLogs.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return res.json({ logs: allLogs.slice(0, limit) });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[API Admin Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
