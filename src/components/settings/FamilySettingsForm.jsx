import React, { useState } from 'react';
import { Trash2, Home } from 'lucide-react';
import { AVATARS } from '../../constants';

export default function FamilySettingsForm({ initialConfig, onSave, onCancel }) {
  const [familyName, setFamilyName] = useState(initialConfig.familyName || '');
  const [parents, setParents] = useState([...initialConfig.parents]);
  const [kids, setKids] = useState(initialConfig.kids.map((k) => ({ ...k })));
  const handleSave = (e) => { e.preventDefault(); onSave(parents.filter((p) => p.name.trim()), kids.filter((k) => k.name.trim()), familyName.trim()); };
  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <h3 className="font-bold mb-2 text-gray-700 text-sm sm:text-base flex items-center gap-2">
          <Home className="w-4 h-4 text-indigo-600" />שם המשפחה
        </h3>
        <input type="text" value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="w-full p-3 border rounded-xl" placeholder="למשל: משפחת כהן" />
      </div>
      <div>
        <h3 className="font-bold mb-2 text-gray-700 text-sm sm:text-base">הורים</h3>
        {parents.map((p, i) => (
          <input key={i} type="text" value={p.name}
            onChange={(e) => { const np = [...parents]; np[i] = { ...np[i], name: e.target.value }; setParents(np); }}
            className="w-full p-3 border rounded-xl mb-2" placeholder="שם הורה" />
        ))}
        {parents.length < 2 && (
          <button type="button" onClick={() => setParents([...parents, { id: 'p' + Date.now(), name: '' }])} className="text-sm text-indigo-600 font-bold">+ הוסף הורה</button>
        )}
      </div>
      <div>
        <h3 className="font-bold mb-2 text-gray-700 text-sm sm:text-base">ילדים</h3>
        {kids.map((k, i) => (
          <div key={k.id} className="mb-3 p-3 border rounded-xl bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input type="text" value={k.name}
                onChange={(e) => { const nk = [...kids]; nk[i] = { ...nk[i], name: e.target.value }; setKids(nk); }}
                className="flex-1 p-2 border rounded-xl bg-white text-sm min-w-0" placeholder="שם ילד" />
              <button type="button" onClick={() => setKids(kids.filter((_, idx) => idx !== i))}
                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {AVATARS.map((a) => (
                <button key={a} type="button" onClick={() => { const nk = [...kids]; nk[i] = { ...nk[i], avatar: a }; setKids(nk); }}
                  className={`text-lg sm:text-xl p-1 rounded-lg border-2 transition-all ${k.avatar === a ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:border-gray-300'}`}>{a}</button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setKids([...kids, { id: 'k' + Date.now(), name: '', balance: 0, pin: null, avatar: '🦁', streak: 0, lastStreakDate: null, wishlist: [] }])}
          className="text-sm text-indigo-600 font-bold">+ הוסף ילד</button>
      </div>
      <div className="flex gap-3 pt-4 border-t">
        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors">שמור</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-3 rounded-xl transition-colors">ביטול</button>
      </div>
    </form>
  );
}
