import React, { useState, useCallback } from 'react';
import { ShieldCheck, Lock, Delete } from 'lucide-react';

export default function PinEntry({ profile, correctPin, onSuccess, onBack }) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((d) => {
    setEntered((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      if (next.length === 4) {
        if (next === correctPin) { setTimeout(onSuccess, 150); }
        else {
          setShake(true); setError(true);
          setTimeout(() => { setEntered(''); setShake(false); setError(false); }, 700);
        }
      }
      return next;
    });
  }, [correctPin, onSuccess]);

  const isParent = profile.type === 'parent';
  const accent = isParent ? 'bg-indigo-600' : 'bg-emerald-500';
  const dotFill = isParent ? 'bg-indigo-600 border-indigo-600' : 'bg-emerald-500 border-emerald-500';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 sm:p-8 text-center">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 ${accent} rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-2xl sm:text-3xl`}>
          {isParent ? <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" /> : (profile.avatar || '🧒')}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">שלום, {profile.name}</h2>
        <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> הכנס קוד כניסה
        </p>
        <div className={`flex justify-center gap-3 sm:gap-4 mb-5 sm:mb-6 ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-150 ${
              i < entered.length ? dotFill : error ? 'border-red-400 bg-red-100' : 'border-gray-300'
            }`} />
          ))}
        </div>
        <div dir="ltr" className="grid grid-cols-3 gap-2 sm:gap-3 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => handleDigit(String(n))}
              className="h-12 sm:h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-lg sm:text-xl font-bold text-gray-800 border border-gray-200 transition-all select-none">
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => handleDigit('0')}
            className="h-12 sm:h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-lg sm:text-xl font-bold text-gray-800 border border-gray-200 transition-all select-none">
            0
          </button>
          <button onClick={() => setEntered((e) => e.slice(0, -1))}
            className="h-12 sm:h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center">
            <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 mt-1 py-1 transition-colors">ביטול</button>
        {error && <p className="text-red-500 text-xs sm:text-sm font-bold mt-1">קוד שגוי, נסה שוב 🔒</p>}
      </div>
    </div>
  );
}
