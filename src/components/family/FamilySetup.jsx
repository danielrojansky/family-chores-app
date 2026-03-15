import React, { useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { AVATARS } from '../../constants';

export default function FamilySetup({ onSetup }) {
  const [setupData, setSetupData] = useState({
    parent1: 'אבא', parent2: 'אמא', parentPin: '',
    kids: [{ id: 'k1', name: 'ילד 1', balance: 0, pin: '', avatar: '🦁' }],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!setupData.parentPin || setupData.parentPin.length !== 4) {
      alert('נדרש קוד הורים בן 4 ספרות'); return;
    }
    const parents = [];
    if (setupData.parent1.trim()) parents.push({ id: 'p1', name: setupData.parent1.trim() });
    if (setupData.parent2.trim()) parents.push({ id: 'p2', name: setupData.parent2.trim() });
    onSetup({
      isSetup: true, parentPin: setupData.parentPin, parents, activityLog: [],
      kids: setupData.kids.filter((k) => k.name.trim()).map((k) => ({
        ...k, name: k.name.trim(), pin: k.pin || null,
        avatar: k.avatar || '🦁', balance: 0, streak: 0, lastStreakDate: null, wishlist: [],
      })),
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-indigo-900 mb-1">הגדרת משפחה 👋</h1>
        <p className="text-center text-gray-500 mb-5 sm:mb-6 text-sm">הגדרה חד-פעמית — הכל נשמר בענן</p>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">הורים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input type="text" value={setupData.parent1} onChange={(e) => setSetupData({ ...setupData, parent1: e.target.value })}
                className="p-3 border rounded-xl" placeholder="הורה 1" />
              <input type="text" value={setupData.parent2} onChange={(e) => setSetupData({ ...setupData, parent2: e.target.value })}
                className="p-3 border rounded-xl" placeholder="הורה 2 (אופציונלי)" />
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
                <Lock className="w-4 h-4" />קוד הורים — 4 ספרות (חובה)
              </label>
              <input type="password" inputMode="numeric" maxLength={4} required value={setupData.parentPin}
                onChange={(e) => setSetupData({ ...setupData, parentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em]" placeholder="••••" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">ילדים</h3>
            {setupData.kids.map((kid, idx) => (
              <div key={kid.id} className="mb-4 p-3 border rounded-xl bg-gray-50">
                <div className="flex gap-2 mb-2">
                  <input type="text" required value={kid.name}
                    onChange={(e) => { const kids = [...setupData.kids]; kids[idx] = { ...kids[idx], name: e.target.value }; setSetupData({ ...setupData, kids }); }}
                    className="flex-1 p-3 border rounded-xl bg-white min-w-0" placeholder={`שם ילד ${idx + 1}`} />
                  <input type="password" inputMode="numeric" maxLength={4} value={kid.pin}
                    onChange={(e) => { const kids = [...setupData.kids]; kids[idx] = { ...kids[idx], pin: e.target.value.replace(/\D/g, '').slice(0, 4) }; setSetupData({ ...setupData, kids }); }}
                    className="w-20 sm:w-24 p-3 border rounded-xl bg-white text-center tracking-widest shrink-0" placeholder="קוד" />
                </div>
                <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                  {AVATARS.map((a) => (
                    <button key={a} type="button" onClick={() => { const kids = [...setupData.kids]; kids[idx] = { ...kids[idx], avatar: a }; setSetupData({ ...setupData, kids }); }}
                      className={`text-lg sm:text-xl p-1 rounded-lg border-2 transition-all ${kid.avatar === a ? 'border-indigo-500 bg-indigo-50 scale-110' : 'border-transparent hover:border-gray-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSetupData({ ...setupData, kids: [...setupData.kids, { id: 'k' + Date.now(), name: '', balance: 0, pin: '', avatar: '🦁' }] })}
                className="text-indigo-600 text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" />הוסף ילד</button>
              {setupData.kids.length > 1 && (
                <button type="button" onClick={() => setSetupData({ ...setupData, kids: setupData.kids.slice(0, -1) })}
                  className="text-red-400 text-sm font-bold flex items-center gap-1"><Trash2 className="w-4 h-4" />הסר</button>
              )}
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 sm:py-4 rounded-xl shadow-md text-base sm:text-lg transition-colors">
            שמור והתחל 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
