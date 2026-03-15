import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AUTH_SESSION_KEY } from '../constants';
import { authCall, authGet } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // { email, name, picture, families }
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState('');

  // ── Check existing session on mount ───────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(AUTH_SESSION_KEY);
    if (!token) { setLoading(false); return; }
    authGet('me')
      .then((data) => setUser(data))
      .catch(() => { localStorage.removeItem(AUTH_SESSION_KEY); })
      .finally(() => setLoading(false));
  }, []);

  // ── Load Google Client ID ────────────────────────────────────────────────
  useEffect(() => {
    authGet('googleClientId')
      .then((data) => setGoogleClientId(data.clientId || ''))
      .catch(() => {});
  }, []);

  // ── Google login ──────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (credential) => {
    const res = await authCall('googleLogin', { credential });
    localStorage.setItem(AUTH_SESSION_KEY, res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // ── Email + password login ────────────────────────────────────────────────
  const loginWithEmail = useCallback(async (email, password) => {
    const res = await authCall('emailLogin', { email, password });
    localStorage.setItem(AUTH_SESSION_KEY, res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (email, password, name) => {
    const res = await authCall('register', { email, password, name });
    localStorage.setItem(AUTH_SESSION_KEY, res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authCall('logout'); } catch {}
    localStorage.removeItem(AUTH_SESSION_KEY);
    setUser(null);
  }, []);

  // ── Refresh user data (e.g. after admin assigns family) ───────────────────
  const refreshUser = useCallback(async () => {
    try {
      const data = await authGet('me');
      setUser(data);
    } catch {}
  }, []);

  const value = {
    user,
    loading,
    googleClientId,
    loginWithGoogle,
    loginWithEmail,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
