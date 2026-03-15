import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiCall } from '../lib/api';
import { saveSession, clearSession, loadSession } from '../lib/session';
import { logAction } from '../lib/logger';

const FamilyContext = createContext(null);

export function FamilyProvider({ familyId, children }) {
  // ── Data (Vercel KV via API, polling every 3 s) ──────────────────────────
  const { data: familyConfig, mutate: mutateConfig, isLoading: configLoading } =
    useSWR(familyId ? `/api/data?type=config&familyId=${familyId}` : null, fetcher, {
      refreshInterval: 3000, revalidateOnFocus: true,
    });

  const { data: rawChores, mutate: mutateChores } =
    useSWR(familyId ? `/api/data?type=chores&familyId=${familyId}` : null, fetcher, {
      refreshInterval: 3000, revalidateOnFocus: true,
    });

  const chores = (rawChores || []).slice().sort((a, b) => b.createdAt - a.createdAt);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const sessionRestoredRef = useRef(false);

  // ── Session restore ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyConfig?.isSetup || sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    const saved = loadSession();
    if (!saved || saved.familyId !== familyId) return;
    const match = saved.type === 'parent'
      ? familyConfig.parents?.find((p) => p.id === saved.id)
      : familyConfig.kids?.find((k) => k.id === saved.id);
    if (match) {
      const restored = { ...match, type: saved.type };
      setSelectedProfile(restored);
      setCurrentProfile(restored);
    }
  }, [familyConfig, familyId]);

  // ── Keep currentProfile in sync with live config ──────────────────────────
  useEffect(() => {
    if (!currentProfile || !familyConfig) return;
    if (currentProfile.type === 'kid') {
      const updated = familyConfig.kids?.find((k) => k.id === currentProfile.id);
      if (updated) setCurrentProfile((prev) => ({ ...prev, ...updated }));
    }
    if (currentProfile.type === 'parent') {
      const updated = familyConfig.parents?.find((p) => p.id === currentProfile.id);
      if (updated) setCurrentProfile((prev) => ({ ...prev, ...updated }));
    }
  }, [familyConfig]); // eslint-disable-line

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const loginAs = useCallback((profile) => {
    saveSession(familyId, profile);
    setCurrentProfile(profile);
    logAction(familyId, 'login', { profileId: profile.id }, { type: profile.type, id: profile.id, name: profile.name });
  }, [familyId]);

  const logout = useCallback(() => {
    if (currentProfile) {
      logAction(familyId, 'logout', {}, { type: currentProfile.type, id: currentProfile.id, name: currentProfile.name });
    }
    clearSession();
    setCurrentProfile(null);
    setSelectedProfile(null);
    setActiveTab('dashboard');
  }, [familyId, currentProfile]);

  // ── Family-scoped apiCall wrapper ─────────────────────────────────────────
  const familyApiCall = useCallback(
    (action, payload = {}) => apiCall(action, { ...payload, familyId }),
    [familyId]
  );

  const value = {
    familyId,
    familyConfig,
    configLoading,
    chores,
    mutateConfig,
    mutateChores,
    selectedProfile,
    setSelectedProfile,
    currentProfile,
    setCurrentProfile,
    activeTab,
    setActiveTab,
    loginAs,
    logout,
    apiCall: familyApiCall,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export const useFamily = () => {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
};
