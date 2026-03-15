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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Simple hash (same as admin.js)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 40; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Decode a Google JWT (without crypto verification — we verify via Google's tokeninfo endpoint)
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch { return null; }
}

// Verify Google token via Google's tokeninfo endpoint
async function verifyGoogleToken(credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!res.ok) return null;
  const data = await res.json();
  // Verify audience matches our client ID
  if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) return null;
  return data;
}

// Get or create user record
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
    // Track in user set for admin listing
    await kv.sadd('app:users', email.toLowerCase());
  } else {
    // Update name/picture on each login if from Google
    if (provider === 'google') {
      user.name = name || user.name;
      user.picture = picture || user.picture;
      await kv.set(key, user);
    }
  }
  return user;
}

// Create a session token
async function createSession(user) {
  const token = generateToken();
  const session = {
    email: user.email,
    name: user.name,
    picture: user.picture,
    families: user.families,
    createdAt: Date.now(),
  };
  await kv.set(`app:user:sessions:${token}`, session);
  await kv.expire(`app:user:sessions:${token}`, 604800); // 7 days
  return { token, user: session };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: validate session / get user info ───────────────────────────────
    if (req.method === 'GET') {
      const { action } = req.query;

      if (action === 'me') {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
        const token = auth.slice(7);
        const session = await kv.get(`app:user:sessions:${token}`);
        if (!session) return res.status(401).json({ error: 'Invalid session' });
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

    // ── POST ────────────────────────────────────────────────────────────────
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, ...payload } = req.body;

    switch (action) {
      // ── Google login ────────────────────────────────────────────────────
      case 'googleLogin': {
        const { credential } = payload;
        if (!credential) return res.status(400).json({ error: 'Missing credential' });

        const googleUser = await verifyGoogleToken(credential);
        if (!googleUser) return res.status(401).json({ error: 'Invalid Google token' });

        const user = await getOrCreateUser(
          googleUser.email,
          googleUser.name,
          googleUser.picture,
          'google'
        );
        const session = await createSession(user);
        return res.json(session);
      }

      // ── Email + password register ───────────────────────────────────────
      case 'register': {
        const { email, password, name } = payload;
        if (!email || !password) return res.status(400).json({ error: 'חסר אימייל או סיסמה' });
        if (password.length < 4) return res.status(400).json({ error: 'סיסמה חייבת להכיל לפחות 4 תווים' });

        const key = `app:users:${email.toLowerCase()}`;
        const existing = await kv.get(key);
        if (existing?.passwordHash) {
          return res.status(409).json({ error: 'משתמש קיים, נסה להתחבר' });
        }

        // If user exists (from Google) but has no password, add password
        const user = existing || {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          picture: null,
          provider: 'email',
          families: [],
          createdAt: Date.now(),
        };
        user.passwordHash = simpleHash(password);
        if (name) user.name = name;
        await kv.set(key, user);
        if (!existing) await kv.sadd('app:users', email.toLowerCase());

        const session = await createSession(user);
        return res.json(session);
      }

      // ── Email + password login ──────────────────────────────────────────
      case 'emailLogin': {
        const { email, password } = payload;
        if (!email || !password) return res.status(400).json({ error: 'חסר אימייל או סיסמה' });

        const key = `app:users:${email.toLowerCase()}`;
        const user = await kv.get(key);
        if (!user) return res.status(401).json({ error: 'משתמש לא נמצא' });
        if (!user.passwordHash) return res.status(401).json({ error: 'משתמש זה נרשם דרך Google. נסה להתחבר עם Google.' });
        if (user.passwordHash !== simpleHash(password)) {
          return res.status(401).json({ error: 'סיסמה שגויה' });
        }

        const session = await createSession(user);
        return res.json(session);
      }

      // ── Logout ──────────────────────────────────────────────────────────
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
    return res.status(500).json({ error: String(err) });
  }
}
