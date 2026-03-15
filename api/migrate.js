import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * One-time migration from v1 (flat keys) to v2 (family-scoped keys).
 *
 * v1 used bare 'config' and 'chores' keys.
 * v2 uses 'family:{familyId}:config' and 'family:{familyId}:chores'.
 *
 * POST /api/migrate
 * Body: { familyId: "optional-custom-id" }
 *
 * This will:
 * 1. Read old 'config' and 'chores' keys
 * 2. Write to new family-scoped keys
 * 3. Register the family in app:families
 * 4. NOT delete old keys (safe — manual cleanup later)
 */
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { familyId: requestedId } = req.body || {};

    // Read old data
    const oldConfig = await kv.get('config');
    const oldChores = await kv.get('chores');

    if (!oldConfig) {
      return res.json({ migrated: false, reason: 'No v1 config found' });
    }

    // Generate or use provided familyId
    const familyId = requestedId || ('mig_' + Date.now().toString(36));

    // Write to new keys
    await kv.set(`family:${familyId}:config`, oldConfig);
    await kv.set(`family:${familyId}:chores`, oldChores || []);
    await kv.sadd('app:families', familyId);

    return res.json({
      migrated: true,
      familyId,
      configKeys: Object.keys(oldConfig || {}),
      choreCount: (oldChores || []).length,
      note: 'Old keys preserved. Visit /family/' + familyId + ' to use the migrated data.',
    });
  } catch (err) {
    console.error('[API Migrate Error]', err);
    return res.status(500).json({ error: String(err) });
  }
}
