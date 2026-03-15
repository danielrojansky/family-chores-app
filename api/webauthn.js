import { Redis } from '@upstash/redis';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { getUserSession } from './_lib/auth.js';
import { generateToken } from './_lib/security.js';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = 'מטלות משפחתיות';
const CHALLENGE_TTL = 300; // 5 minutes

// ─── Helper: create user session (same as auth.js) ───────────────────────────
async function createSession(user) {
  const token = generateToken(32);
  const now = Date.now();
  const session = {
    email: user.email,
    name: user.name,
    picture: user.picture,
    families: user.families || [],
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  };
  await kv.set(`app:user:sessions:${token}`, session);
  await kv.expire(`app:user:sessions:${token}`, 7 * 24 * 60 * 60);
  return { token, user: session };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, ...payload } = req.body;

    // ── Register: get options (requires existing login session) ───────────────
    if (action === 'registerOptions') {
      const session = await getUserSession(req, kv);
      if (!session) return res.status(401).json({ error: 'Authentication required' });

      const email = session.email;
      // Get existing credential IDs to exclude from re-registration
      const existing = await kv.hgetall(`webauthn:creds:${email}`) || {};
      const excludeCredentials = Object.values(existing).map((c) => ({
        id: c.id, type: 'public-key', transports: c.transports || [],
      }));

      const options = await generateRegistrationOptions({
        rpID: RP_ID,
        rpName: RP_NAME,
        userID: Buffer.from(email),
        userName: email,
        userDisplayName: session.name || email,
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        excludeCredentials,
      });

      // Store challenge with 5-min TTL
      await kv.set(`webauthn:challenge:${email}`, options.challenge);
      await kv.expire(`webauthn:challenge:${email}`, CHALLENGE_TTL);

      return res.json(options);
    }

    // ── Register: verify response ──────────────────────────────────────────────
    if (action === 'registerVerify') {
      const session = await getUserSession(req, kv);
      if (!session) return res.status(401).json({ error: 'Authentication required' });

      const email = session.email;
      const expectedChallenge = await kv.get(`webauthn:challenge:${email}`);
      if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired or missing' });

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: payload.response,
          expectedChallenge,
          expectedRPID: RP_ID,
          expectedOrigin: process.env.APP_ORIGIN || `https://${RP_ID}`,
          requireUserVerification: false,
        });
      } catch (err) {
        return res.status(400).json({ error: `Verification failed: ${err.message}` });
      }

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: 'Registration not verified' });
      }

      const { credential } = verification.registrationInfo;
      const credId = Buffer.from(credential.id).toString('base64url');
      const credData = {
        id: credId,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: payload.response.response?.transports || [],
        registeredAt: Date.now(),
        deviceName: payload.deviceName || 'Unknown device',
      };

      await kv.hset(`webauthn:creds:${email}`, { [credId]: credData });
      await kv.del(`webauthn:challenge:${email}`);
      return res.json({ ok: true, credentialId: credId });
    }

    // ── Authenticate: get options (public) ────────────────────────────────────
    if (action === 'authOptions') {
      const { email } = payload;
      if (!email) return res.status(400).json({ error: 'Missing email' });

      const creds = await kv.hgetall(`webauthn:creds:${email.toLowerCase()}`);
      if (!creds || Object.keys(creds).length === 0) {
        return res.status(404).json({ error: 'No passkeys registered for this account' });
      }

      const allowCredentials = Object.values(creds).map((c) => ({
        id: c.id, type: 'public-key', transports: c.transports || [],
      }));

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'preferred',
        allowCredentials,
      });

      await kv.set(`webauthn:challenge:${email.toLowerCase()}`, options.challenge);
      await kv.expire(`webauthn:challenge:${email.toLowerCase()}`, CHALLENGE_TTL);

      return res.json(options);
    }

    // ── Authenticate: verify response ─────────────────────────────────────────
    if (action === 'authVerify') {
      const { email, response: authResponse } = payload;
      if (!email || !authResponse) return res.status(400).json({ error: 'Missing email or response' });

      const normalizedEmail = email.toLowerCase();
      const expectedChallenge = await kv.get(`webauthn:challenge:${normalizedEmail}`);
      if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired or missing' });

      const creds = await kv.hgetall(`webauthn:creds:${normalizedEmail}`);
      if (!creds) return res.status(404).json({ error: 'No passkeys found' });

      // Find the matching credential
      const credIdUsed = authResponse.id;
      const storedCred = Object.values(creds).find((c) => c.id === credIdUsed);
      if (!storedCred) return res.status(400).json({ error: 'Unknown credential' });

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: authResponse,
          expectedChallenge,
          expectedRPID: RP_ID,
          expectedOrigin: process.env.APP_ORIGIN || `https://${RP_ID}`,
          credential: {
            id: storedCred.id,
            publicKey: Buffer.from(storedCred.publicKey, 'base64url'),
            counter: storedCred.counter,
            transports: storedCred.transports,
          },
          requireUserVerification: false,
        });
      } catch (err) {
        return res.status(400).json({ error: `Authentication failed: ${err.message}` });
      }

      if (!verification.verified) return res.status(401).json({ error: 'Authentication not verified' });

      // Update counter (replay attack protection)
      storedCred.counter = verification.authenticationInfo.newCounter;
      await kv.hset(`webauthn:creds:${normalizedEmail}`, { [credIdUsed]: storedCred });
      await kv.del(`webauthn:challenge:${normalizedEmail}`);

      // Issue session
      const user = await kv.get(`app:users:${normalizedEmail}`);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const session = await createSession(user);
      return res.json(session);
    }

    // ── List passkeys ─────────────────────────────────────────────────────────
    if (action === 'listPasskeys') {
      const session = await getUserSession(req, kv);
      if (!session) return res.status(401).json({ error: 'Authentication required' });
      const creds = await kv.hgetall(`webauthn:creds:${session.email}`) || {};
      const passkeys = Object.values(creds).map(({ id, registeredAt, deviceName, transports }) => ({
        id, registeredAt, deviceName, transports,
      }));
      return res.json({ passkeys });
    }

    // ── Delete passkey ────────────────────────────────────────────────────────
    if (action === 'deletePasskey') {
      const session = await getUserSession(req, kv);
      if (!session) return res.status(401).json({ error: 'Authentication required' });
      const { credentialId } = payload;
      if (!credentialId) return res.status(400).json({ error: 'Missing credentialId' });
      await kv.hdel(`webauthn:creds:${session.email}`, credentialId);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[API WebAuthn Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
