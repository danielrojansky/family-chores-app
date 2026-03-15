import { STORAGE_KEY } from '../constants';

// Session shape: { familyId, id, type }

export const saveSession = (familyId, profile) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      familyId,
      id: profile.id,
      type: profile.type,
    }));
  } catch {}
};

export const clearSession = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

export const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
};
