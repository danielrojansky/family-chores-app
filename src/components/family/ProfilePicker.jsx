import React from 'react';
import { ShieldCheck, Lock, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../../constants';
import { useFamily } from '../../context/FamilyContext';

export default function ProfilePicker() {
  const { familyConfig, familyId, setSelectedProfile, loginAs } = useFamily();

  const handleSelectProfile = (profile) => {
    if (profile.type === 'kid') {
      const kidConfig = familyConfig.kids.find((k) => k.id === profile.id);
      if (!kidConfig?.pin) { setSelectedProfile(profile); loginAs(profile); return; }
    }
    setSelectedProfile(profile);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">מי משתמש כעת? 🏠</h1>
        <p className="text-sm text-gray-400 mb-5 sm:mb-6">בחר פרופיל להמשך</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 sm:mb-6">
          {familyConfig.parents?.map((p) => (
            <button key={p.id} onClick={() => handleSelectProfile({ type: 'parent', ...p })}
              className="p-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors flex flex-col items-center gap-1">
              <ShieldCheck className="w-7 h-7" />{p.name}
              <span className="text-xs font-normal text-indigo-500 flex items-center gap-1"><Lock className="w-3 h-3" />דרוש קוד</span>
            </button>
          ))}
        </div>
        <div className="border-t pt-4 sm:pt-6 grid gap-3">
          {familyConfig.kids?.map((k) => (
            <button key={k.id} onClick={() => handleSelectProfile({ type: 'kid', ...k })}
              className="p-3 sm:p-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{k.avatar || '🧒'}</span>
                <div className="text-right min-w-0">
                  <div className="truncate">{k.name}</div>
                  <div className="text-xs text-emerald-600 font-normal flex items-center gap-1">
                    {k.balance || 0} <Coins className="w-3 h-3 text-yellow-500" />
                    {(k.streak || 0) > 1 && <span className="text-orange-500 mr-1">🔥{k.streak}</span>}
                  </div>
                </div>
              </div>
              {k.pin && <span className="text-xs text-emerald-500 flex items-center gap-1 shrink-0 mr-2"><Lock className="w-3 h-3" />קוד</span>}
            </button>
          ))}
        </div>
        <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2">
          <p className="text-xs text-gray-300">גרסה {APP_VERSION}</p>
          <span className="text-gray-200">|</span>
          <Link to="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">ניהול</Link>
        </div>
      </div>
    </div>
  );
}
