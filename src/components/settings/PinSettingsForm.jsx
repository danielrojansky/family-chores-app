import React, { useState } from 'react';
import { ShieldCheck, User, X, Check } from 'lucide-react';

/* ── Parent PIN section ──────────────────────────────────────────────────── */
function ParentPinSection({ onSave }) {
  const [parentPin, setParentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (parentPin.length !== 4) { setPinError('קוד הורים חייב להיות 4 ספרות'); return; }
    setPinError('');
    onSave(parentPin);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setParentPin('');
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-bold text-indigo-800">
        <ShieldCheck className="w-4 h-4" />קוד הורים (4 ספרות)
      </label>
      <input type="password" inputMode="numeric" maxLength={4} required value={parentPin}
        onChange={(e) => { setParentPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); setSaved(false); }}
        className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="הכנס קוד חדש" />
      <p className="text-xs text-indigo-500">הכנס קוד חדש בן 4 ספרות</p>
      {pinError && <p className="text-red-500 text-sm font-medium">{pinError}</p>}
      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2">
        {saved ? <><Check className="w-4 h-4" />נשמר!</> : 'עדכן קוד הורים'}
      </button>
    </form>
  );
}

/* ── Kids PIN section ────────────────────────────────────────────────────── */
function KidsPinSection({ initialKids, onSave }) {
  const [kids, setKids] = useState(initialKids.map((k) => ({ ...k, pin: k.pin === '****' ? '' : (k.pin || ''), changed: false })));
  const [saved, setSaved] = useState(false);

  const updateKidPin = (index, pin) => {
    const nk = [...kids];
    nk[index] = { ...nk[index], pin, changed: true };
    setKids(nk);
    setSaved(false);
  };

  const clearKidPin = (index) => {
    const nk = [...kids];
    nk[index] = { ...nk[index], pin: '', changed: true };
    setKids(nk);
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Only send kids with changes, but include all kids to preserve the array
    const updatedKids = kids.map(({ changed, ...k }) => ({ ...k, pin: k.pin || null }));
    onSave(updatedKids);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setKids((prev) => prev.map((k) => ({ ...k, changed: false })));
  };

  const hasChanges = kids.some((k) => k.changed);

  if (kids.length === 0) return null;

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <User className="w-4 h-4 text-emerald-600" />קודי ילדים
        </label>
        <span className="text-xs text-gray-400">השאר ריק = כניסה חופשית</span>
      </div>
      {kids.map((k, i) => (
        <div key={k.id} className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl shrink-0">{k.avatar || '🧒'}</span>
          <span className="flex-1 font-bold text-sm text-gray-700 truncate min-w-0">{k.name}</span>
          <input type="password" inputMode="numeric" maxLength={4} value={k.pin}
            onChange={(e) => updateKidPin(i, e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={`w-20 sm:w-28 p-2 border rounded-xl text-center tracking-widest text-sm shrink-0 outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${k.changed ? 'border-emerald-300 bg-emerald-50' : ''}`}
            placeholder="ללא קוד" />
          {k.pin && (
            <button type="button" onClick={() => clearKidPin(i)}
              className="text-red-400 hover:text-red-600 shrink-0 p-1 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          )}
        </div>
      ))}
      <button type="submit" disabled={!hasChanges && !saved}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2">
        {saved ? <><Check className="w-4 h-4" />נשמר!</> : 'עדכן קודי ילדים'}
      </button>
    </form>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function PinSettingsForm({ initialConfig, onSaveParentPin, onSaveKidPins, onCancel }) {
  return (
    <div className="space-y-6">
      {/* Parent PIN — independent section */}
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <ParentPinSection onSave={onSaveParentPin} />
      </div>

      {/* Kids PINs — independent section */}
      {initialConfig.kids?.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <KidsPinSection initialKids={initialConfig.kids} onSave={onSaveKidPins} />
        </div>
      )}

      <button type="button" onClick={onCancel}
        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-3 rounded-xl transition-colors">
        חזרה
      </button>
    </div>
  );
}
