import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { AUTH_SESSION_KEY } from '../constants';

// ─── Feature detection ────────────────────────────────────────────────────────
export function isWebAuthnSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

// ─── API helper ───────────────────────────────────────────────────────────────
const getToken = () => {
  try { return localStorage.getItem(AUTH_SESSION_KEY) || ''; } catch { return ''; }
};

async function webauthnCall(action, payload = {}, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (requireAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/webauthn', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `WebAuthn error ${res.status}`);
  }
  return res.json();
}

// ─── Registration flow (for logged-in parent adding a passkey) ────────────────
export async function registerPasskey(deviceName = 'מכשיר') {
  // 1. Get options from server
  const options = await webauthnCall('registerOptions', {}, true);

  // 2. Prompt browser (biometric / hardware key)
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (err) {
    if (err.name === 'NotAllowedError') throw new Error('ההרשמה בוטלה');
    throw err;
  }

  // 3. Verify on server
  const result = await webauthnCall('registerVerify', { response, deviceName }, true);
  return result;
}

// ─── Authentication flow (passkey login) ─────────────────────────────────────
export async function loginWithPasskey(email) {
  if (!email?.trim()) throw new Error('נא להזין אימייל');

  // 1. Get options from server
  const options = await webauthnCall('authOptions', { email: email.toLowerCase() });

  // 2. Prompt browser
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    if (err.name === 'NotAllowedError') throw new Error('האימות בוטל');
    throw err;
  }

  // 3. Verify on server + get session
  const session = await webauthnCall('authVerify', { email: email.toLowerCase(), response });
  return session;
}

// ─── Passkey management ───────────────────────────────────────────────────────
export async function listPasskeys() {
  return webauthnCall('listPasskeys', {}, true);
}

export async function deletePasskey(credentialId) {
  return webauthnCall('deletePasskey', { credentialId }, true);
}
