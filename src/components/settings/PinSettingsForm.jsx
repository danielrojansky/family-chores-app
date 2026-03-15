import React, { useState } from 'react';
import { ShieldCheck, User, X } from 'lucide-react';

export default function PinSettingsForm({ initialConfig, onSave, onCancel }) {
  const [parentPin, setParentPin] = useState(initialConfig.parentPin || '');
  const [kids, setKids] = useState(initialConfig.kids.map((k) => ({ ...k, pin: k.pin || '' })));
  const [pinError, setPinError] = useState('');
  const handleSave = (e) => {
    e.preventDefault();
    if (parentPin.length !== 4) { setPinError('קוד הורים חייב להיות 4 ספרות'); return; }
    setPinError('');
    onSave(parentPin, kids.map((k) => ({ ...k, pin: k.pin || null })));
  };
  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
          <ShieldCheck className="w-4 h-4" />קוד הורים (4 ספרות)
        </label>
        <input type="password" inputMode="numeric" maxLength={4} required value={parentPin}
          onChange={(e) => { setParentPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
          className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em]" placeholder="••••" />
        {pinError && <p className="text-red-500 text-sm mt-2 font-medium">{pinError}</p>}
      </div>
      <div>
        <h3 className="font-bold mb-1 text-gray-700 text-sm sm:text-base flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />קודי ילדים (אופציונלי)
        </h3>
        <p className="text-xs text-gray-400 mb-3">השאר ריק = כניסה חופשית</p>
        {kids.map((k, i) => (
          <div key={k.id} className="flex items-center gap-2 sm:gap-3 mb-3">
            <span className="text-xl shrink-0">{k.avatar || '🧒'}</span>
            <span className="flex-1 font-bold text-sm text-gray-700 truncate min-w-0">{k.name}</span>
            <input type="password" inputMode="numeric" maxLength={4} value={k.pin}
              onChange={(e) => { const nk = [...kids]; nk[i] = { ...nk[i], pin: e.target.value.replace(/\D/g, '').slice(0, 4) }; setKids(nk); }}
              className="w-20 sm:w-28 p-2 border rounded-xl text-center tracking-widest text-sm shrink-0" placeholder="ללא קוד" />
            {k.pin && (
              <button type="button" onClick={() => { const nk = [...kids]; nk[i] = { ...nk[i], pin: '' }; setKids(nk); }}
                className="text-red-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4 border-t">
        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors">שמור קודים</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-3 rounded-xl transition-colors">ביטול</button>
      </div>
    </form>
  );
}
