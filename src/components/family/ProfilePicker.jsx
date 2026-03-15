import React from 'react';
import { ShieldCheck, Lock, Coins, Unlock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../../constants';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePicker() {
  const { familyConfig, setSelectedProfile } = useFamily();
  const { user } = useAuth();

  const isGoogleParent = user?.provider === 'google';

  const handleSelect = (profile) => setSelectedProfile(profile);

  const parents = familyConfig.parents || [];
  const kids = familyConfig.kids || [];
  const familyName = familyConfig.familyName;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 text-center">
          {familyName && <p className="text-indigo-200 text-xs mb-1">{familyName}</p>}
          <h1 className="text-xl font-bold text-white">מי משתמש כעת?</h1>
          <p className="text-indigo-200 text-sm mt-0.5">בחר את הפרופיל שלך</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Parents */}
          {parents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">הורים</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {parents.map((p) => (
                  <button key={p.id}
                    onClick={() => handleSelect({ type: 'parent', ...p })}
                    className="p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl font-bold transition-all active:scale-[0.98] flex flex-col items-center gap-1.5 text-indigo-800 group">
                    <div className="w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-xs font-normal flex items-center gap-1">
                      {isGoogleParent ? (
                        <><Unlock className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">כניסה חופשית</span></>
                      ) : (
                        <><Lock className="w-3 h-3 text-indigo-500" /><span className="text-indigo-500">דרוש קוד</span></>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {parents.length > 0 && kids.length > 0 && (
            <div className="border-t border-slate-100" />
          )}

          {/* Kids */}
          {kids.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">ילדים</p>
              <div className="space-y-2">
                {kids.map((k) => (
                  <button key={k.id}
                    onClick={() => handleSelect({ type: 'kid', ...k })}
                    className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center gap-3 text-emerald-800">
                    <div className="w-11 h-11 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center text-2xl shrink-0">
                      {k.avatar || '🧒'}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm font-semibold truncate">{k.name}</div>
                      <div className="text-xs text-emerald-600 font-normal flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          {k.balance || 0} <Coins className="w-3 h-3 text-yellow-500" />
                        </span>
                        {(k.streak || 0) > 1 && (
                          <span className="text-orange-500">🔥 {k.streak} ימים</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-emerald-500 flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3" />
                      {k.pin ? 'קוד' : 'כניסה חופשית'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-300">גרסה {APP_VERSION}</p>
            <span className="text-slate-200">|</span>
            <Link to="/admin" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">ניהול</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
