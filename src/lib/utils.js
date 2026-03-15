// ─── Date helpers ───────────────────────────────────────────────────────────
export const today = () => new Date().toISOString().slice(0, 10);

export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ─── Streak calculation ─────────────────────────────────────────────────────
export const calcStreak = (kid) => {
  if (!kid.lastStreakDate) return 1;
  if (kid.lastStreakDate === today()) return kid.streak || 1;
  if (kid.lastStreakDate === yesterday()) return (kid.streak || 0) + 1;
  return 1;
};

// ─── Activity log ───────────────────────────────────────────────────────────
export const appendActivity = (config, entry, maxEntries = 50) =>
  [entry, ...(config.activityLog || [])].slice(0, maxEntries);
