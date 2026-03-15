import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword, generateToken } from './_lib/security.js';
import { checkLimit, loginLimiter } from './_lib/rateLimit.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Google token verification ────────────────────────────────────────────────
async function verifyGoogleToken(credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) return null;
  return data;
}

// ─── User management ──────────────────────────────────────────────────────────
async function getOrCreateUser(email, name, picture, provider) {
  const key = `app:users:${email.toLowerCase()}`;
  let user = await kv.get(key);
  if (!user) {
    user = {
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      picture: picture || null,
      provider,
      families: [],
      createdAt: Date.now(),
    };
    await kv.set(key, user);
    await kv.sadd('app:users', email.toLowerCase());
  } else if (provider === 'google') {
    user.name = name || user.name;
    user.picture = picture || user.picture;
    await kv.set(key, user);
  }
  return user;
}

// ─── Session creation ─────────────────────────────────────────────────────────
async function createSession(user) {
  const token = generateToken(32);
  const now = Date.now();
  const session = {
    email: user.email,
    name: user.name,
    picture: user.picture,
    families: user.families,
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  await kv.set(`app:user:sessions:${token}`, session);
  await kv.expire(`app:user:sessions:${token}`, 7 * 24 * 60 * 60);
  return { token, user: session };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { action } = req.query;

      if (action === 'me') {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
        const token = auth.slice(7);
        const session = await kv.get(`app:user:sessions:${token}`);
        if (!session) return res.status(401).json({ error: 'Invalid session' });
        if (session.expiresAt && session.expiresAt < Date.now()) {
          await kv.del(`app:user:sessions:${token}`);
          return res.status(401).json({ error: 'Session expired' });
        }
        // Refresh user data (families may have changed)
        const user = await kv.get(`app:users:${session.email}`);
        if (user) {
          session.families = user.families;
          session.name = user.name;
          session.picture = user.picture;
        }
        return res.json(session);
      }

      if (action === 'googleClientId') {
        return res.json({ clientId: GOOGLE_CLIENT_ID });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, ...payload } = req.body;

    switch (action) {
      // ── Google login ──────────────────────────────────────────────────────
      case 'googleLogin': {
        const { credential } = payload;
        if (!credential) return res.status(400).json({ error: 'Missing credential' });
        const googleUser = await verifyGoogleToken(credential);
        if (!googleUser) return res.status(401).json({ error: 'Invalid Google token' });
        const user = await getOrCreateUser(googleUser.email, googleUser.name, googleUser.picture, 'google');
        const session = await createSession(user);
        return res.json(session);
      }

      // ── Email register ────────────────────────────────────────────────────
      case 'register': {
        const { email, password, name } = payload;
        if (!email || !password) return res.status(400).json({ error: 'חסר אימייל או סיסמה' });
        if (password.length < 8) return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים' });

        // Rate limit by email
        if (await checkLimit(loginLimiter, `reg:${email.toLowerCase()}`, res)) return;

        const key = `app:users:${email.toLowerCase()}`;
        const existing = await kv.get(key);
        if (existing?.passwordHash) return res.status(409).json({ error: 'משתמש קיים, נסה להתחבר' });

        const user = existing || {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          picture: null,
          provider: 'email',
          families: [],
          createdAt: Date.now(),
        };
        user.passwordHash = await hashPassword(password);
        if (name) user.name = name;
        await kv.set(key, user);
        if (!existing) await kv.sadd('app:users', email.toLowerCase());

        const session = await createSession(user);
        return res.json(session);
      }

      // ── Email login ───────────────────────────────────────────────────────
      case 'emailLogin': {
        const { email, password } = payload;
        if (!email || !password) return res.status(400).json({ error: 'חסר אימייל או סיסמה' });

        // Rate limit by email to prevent brute force
        if (await checkLimit(loginLimiter, `login:${email.toLowerCase()}`, res)) return;

        const key = `app:users:${email.toLowerCase()}`;
        const user = await kv.get(key);
        if (!user) return res.status(401).json({ error: 'פרטים שגויים' });
        if (!user.passwordHash) return res.status(401).json({ error: 'משתמש זה נרשם דרך Google. נסה להתחבר עם Google.' });

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'פרטים שגויים' });

        // Transparent migration: if legacy hash, re-hash with scrypt
        if (user.passwordHash.startsWith('h_')) {
          user.passwordHash = await hashPassword(password);
          await kv.set(key, user);
        }

        const session = await createSession(user);
        return res.json(session);
      }

      // ── Logout ────────────────────────────────────────────────────────────
      case 'logout': {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) {
          await kv.del(`app:user:sessions:${auth.slice(7)}`);
        }
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[API Auth Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
