// ─── Shared Authorization Middleware ─────────────────────────────────────────

/**
 * Extract and validate a user session from the Authorization header.
 * Returns the session object or null.
 */
export async function getUserSession(req, kv) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const session = await kv.get(`app:user:sessions:${token}`);
    return session || null;
  } catch { return null; }
}

/**
 * Verify that the requesting user has access to a specific family.
 * Returns { session, role } on success.
 * Calls res.status(401/403).json(...) and returns null on failure.
 */
export async function requireFamilyAccess(req, res, kv, familyId) {
  const session = await getUserSession(req, kv);
  if (!session) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const entry = (session.families || []).find((f) => f.familyId === familyId);
  if (!entry) {
    res.status(403).json({ error: 'Access denied to this family' });
    return null;
  }
  return { session, role: entry.role };
}

/**
 * Verify an admin session token and that it has not expired.
 * Returns true/false.
 */
export async function verifyAdminSession(req, kv) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  try {
    const session = await kv.get(`app:admin:sessions:${token}`);
    if (!session) return false;
    // Validate expiry explicitly (belt-and-suspenders with Redis TTL)
    if (session.expiresAt && session.expiresAt < Date.now()) return false;
    return true;
  } catch { return false; }
}

/**
 * Verify a valid invite code for family creation flows.
 * Returns the invite object or null.
 */
export async function getValidInvite(kv, code, requiredFamilyId = null) {
  if (!code) return null;
  try {
    const invite = await kv.get(`app:invites:${code}`);
    if (!invite || invite.used) return null;
    if (requiredFamilyId && invite.familyId && invite.familyId !== requiredFamilyId) return null;
    return invite;
  } catch { return null; }
}
