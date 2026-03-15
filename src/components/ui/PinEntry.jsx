import React, { useState, useCallback, useEffect } from 'react';
import { ShieldCheck, Lock, Delete, AlertTriangle } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

export default function PinEntry({ profile, onSuccess, onBack }) {
  const { apiCall } = useFamily();
  const [entered, setEntered] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [shake, setShake] = useState(false);

  // Lockout countdown
  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const t = setInterval(() => {
      setLockedSeconds((s) => {
        if (s <= 1) { clearInterval(t); setError(''); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockedSeconds]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = useCallback(async (d) => {
    if (validating || lockedSeconds > 0) return;

    setEntered((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;

      if (next.length === 4) {
        // Validate server-side
        (async () => {
          setValidating(true);
          try {
            const result = await apiCall('validatePin', {
              profileId: profile.id,
              pin: next,
              type: profile.type,
            });

            if (result.ok) {
              setTimeout(onSuccess, 150);
            } else if (result.locked) {
              setLockedSeconds(result.lockedSeconds || 600);
              setError(`חשבון נעול. נסה שוב בעוד ${Math.ceil((result.lockedSeconds || 600) / 60)} דקות`);
              setEntered('');
              triggerShake();
            } else {
              const left = result.attemptsLeft ?? null;
              setAttemptsLeft(left);
              setError(left !== null && left <= 2
                ? `קוד שגוי — נשארו ${left} ניסיונות`
                : 'קוד שגוי, נסה שוב'
              );
              setEntered('');
              triggerShake();
            }
          } catch {
            setError('שגיאת תקשורת, נסה שוב');
            setEntered('');
            triggerShake();
          } finally {
            setValidating(false);
          }
        })();
      }
      return next;
    });
  }, [validating, lockedSeconds, apiCall, profile, onSuccess]);

  const handleDelete = () => {
    if (!validating) setEntered((e) => e.slice(0, -1));
  };

  const handleVibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const isParent = profile.type === 'parent';
  const accentBg = isParent ? 'bg-indigo-600' : 'bg-emerald-500';
  const accentDot = isParent ? 'bg-indigo-600 border-indigo-600' : 'bg-emerald-500 border-emerald-500';
  const accentBtn = isParent
    ? 'hover:bg-indigo-50 active:bg-indigo-100 border-slate-200'
    : 'hover:bg-emerald-50 active:bg-emerald-100 border-slate-200';
  const isLocked = lockedSeconds > 0;

  const formatLockTime = (s) => {
    if (s >= 60) return `${Math.ceil(s / 60)} דקות`;
    return `${s} שניות`;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-xs overflow-hidden">
        {/* Header */}
        <div className={`${accentBg} p-6 text-center`}>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
            {isParent ? <ShieldCheck className="w-8 h-8 text-white" /> : (profile.avatar || '🧒')}
          </div>
          <h2 className="text-lg font-bold text-white">שלום, {profile.name}</h2>
          <p className="text-xs text-white/70 mt-0.5 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> הכנס קוד כניסה
          </p>
        </div>

        <div className="p-6">
          {/* Lockout state */}
          {isLocked ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="font-bold text-slate-700 mb-1">חשבון נעול זמנית</p>
              <p className="text-sm text-slate-500 mb-3">יותר מדי ניסיונות שגויים</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-2xl font-mono font-bold text-amber-600">{formatLockTime(lockedSeconds)}</p>
                <p className="text-xs text-amber-500 mt-1">עד שתוכל לנסות שוב</p>
              </div>
              <button onClick={onBack} className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                חזרה לבחירת משתמש
              </button>
            </div>
          ) : (
            <>
              {/* PIN dots */}
              <div className={`flex justify-center gap-4 mb-6 ${shake ? 'animate-ping-once' : ''}`}
                style={shake ? { animation: 'shake 0.4s ease' } : {}}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                    validating ? 'border-slate-300 bg-slate-200 animate-pulse' :
                    i < entered.length ? accentDot :
                    'border-slate-300'
                  }`} />
                ))}
              </div>

              {/* Error / attempts */}
              {error && (
                <div className={`text-center mb-4 rounded-xl p-2.5 text-sm font-medium
                  ${attemptsLeft !== null && attemptsLeft <= 2
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                  {error}
                </div>
              )}

              {/* Numpad */}
              <div dir="ltr" className="grid grid-cols-3 gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n}
                    onClick={() => { handleVibrate(); handleDigit(String(n)); }}
                    disabled={validating}
                    className={`h-14 rounded-2xl bg-slate-50 ${accentBtn} disabled:opacity-40
                      text-xl font-bold text-slate-800 border transition-all select-none active:scale-95`}>
                    {n}
                  </button>
                ))}
                <div />
                <button onClick={() => { handleVibrate(); handleDigit('0'); }}
                  disabled={validating}
                  className={`h-14 rounded-2xl bg-slate-50 ${accentBtn} disabled:opacity-40
                    text-xl font-bold text-slate-800 border transition-all select-none active:scale-95`}>
                  0
                </button>
                <button onClick={handleDelete} disabled={validating}
                  className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40">
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {validating && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="w-3 h-3 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  מאמת...
                </div>
              )}

              <button onClick={onBack} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                ביטול
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
