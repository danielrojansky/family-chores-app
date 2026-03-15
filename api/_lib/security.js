import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

// ─── Password / Hash Utilities ───────────────────────────────────────────────

/**
 * Hash a password using scrypt (memory-hard, built-in to Node.js).
 * Format: "scrypt:<hex-salt>:<hex-hash>"
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a stored hash.
 * Supports both new scrypt format and legacy simpleHash format (for migration).
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // New format: "scrypt:<salt>:<hash>"
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, hashHex] = storedHash.split(':');
    if (!salt || !hashHex) return false;
    try {
      const derived = await scrypt(password, salt, 64);
      const stored = Buffer.from(hashHex, 'hex');
      return derived.length === stored.length && timingSafeEqual(derived, stored);
    } catch { return false; }
  }

  // Legacy format: "h_<djb2-hash>" — fall back for existing users
  if (storedHash.startsWith('h_')) {
    return simpleHashLegacy(password) === storedHash;
  }

  return false;
}

/**
 * Legacy DJB2 hash — kept only for migrating existing users.
 * Never use for new hashes.
 */
function simpleHashLegacy(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

// ─── Token / Code Generation ─────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * Default: 32 bytes → 64-char hex string.
 */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate a URL-safe invite code.
 * 8 bytes → 11-char base64url string (no padding issues).
 */
export function generateInviteCode() {
  return randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).padEnd(12, '0');
}

/**
 * Hash any string with SHA-256 (for non-password use, e.g. deduplication).
 */
export function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}
