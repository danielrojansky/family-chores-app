import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle, Clock, Coins, Check, X, Gift, Heart,
  TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import Header from '../ui/Header';
import Confetti from '../ui/Confetti';
import { useFamily } from '../../context/FamilyContext';
import { logAction } from '../../lib/logger';

export default function ChildDashboard() {
  const { familyId, familyConfig, chores, currentProfile, mutateChores, mutateConfig, apiCall } = useFamily();

  const [completingChoreId, setCompletingChoreId] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [newWishItem, setNewWishItem] = useState('');

  const fileInputRef = useRef(null);
  const prevApprovedRef = useRef(new Set());

  // ── Confetti when kid's chore gets approved ───────────────────────────────
  useEffect(() => {
    if (!currentProfile || currentProfile.type !== 'kid') return;
    const approved = new Set(
      chores.filter((c) => c.status === 'approved' && c.completedBy === currentProfile.id).map((c) => c.id)
    );
    if (prevApprovedRef.current.size > 0) {
      const newOnes = [...approved].filter((id) => !prevApprovedRef.current.has(id));
      if (newOnes.length > 0) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); }
    }
    prevApprovedRef.current = approved;
  }, [chores, currentProfile]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleImageCapture = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 500 / img.width;
        canvas.width = 500; canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setProofImage(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submitChoreCompletion = async () => {
    if (!completingChoreId) return;
    const chore = chores.find((c) => c.id === completingChoreId);
    await apiCall('updateChore', { id: completingChoreId, patch: {
      status: 'pending_approval', completedBy: currentProfile.id,
      proofImage: proofImage || null, rejectionNote: null,
    }});
    await mutateChores();
    setCompletingChoreId(null); setProofImage(null);
    logAction(familyId, 'chore.completed', {
      choreId: completingChoreId, choreTitle: chore?.title, hasProof: !!proofImage,
    }, { type: 'kid', id: currentProfile.id, name: currentProfile.name });
  };

  const handleAddWishItem = async () => {
    if (!newWishItem.trim() || !currentProfile) return;
    const updatedKids = familyConfig.kids.map((k) =>
      k.id === currentProfile.id ? { ...k, wishlist: [...(k.wishlist || []), { id: 'w' + Date.now(), text: newWishItem.trim() }] } : k
    );
    await apiCall('updateConfig', { patch: { kids: updatedKids } }); await mutateConfig(); setNewWishItem('');
  };

  const handleRemoveWishItem = async (itemId) => {
    const updatedKids = familyConfig.kids.map((k) =>
      k.id === currentProfile.id ? { ...k, wishlist: (k.wishlist || []).filter((w) => w.id !== itemId) } : k
    );
    await apiCall('updateConfig', { patch: { kids: updatedKids } }); await mutateConfig();
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const childConfig = familyConfig.kids?.find((k) => k.id === currentProfile.id);
  const availableChores = chores.filter((c) => c.status === 'open' && (c.assignedTo === 'all' || c.assignedTo === currentProfile.id));
  const myPending = chores.filter((c) => c.status === 'pending_approval' && c.completedBy === currentProfile.id);
  const myCompleted = chores.filter((c) => c.status === 'approved' && c.completedBy === currentProfile.id);
  const rejected = availableChores.filter((c) => c.rejectionNote);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
      <Header />
      {showConfetti && <Confetti />}

      {/* Photo proof modal */}
      {completingChoreId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm text-center shadow-2xl">
            <h3 className="font-bold text-lg sm:text-xl mb-1">תמונה להורים? 📷</h3>
            <p className="text-sm text-gray-400 mb-3 sm:mb-4">אופציונלי — תמונה כהוכחה</p>
            <div className="relative border-2 border-dashed rounded-xl bg-gray-50 h-32 sm:h-40 mb-4 flex items-center justify-center overflow-hidden">
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture}
                className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              {proofImage
                ? <img src={proofImage} className="w-full h-full object-cover" alt="הוכחה" />
                : <span className="text-gray-400 text-sm pointer-events-none">לחצו לצלם תמונה</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={submitChoreCompletion} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-3 rounded-xl transition-colors">שליחה ✅</button>
              <button onClick={() => { setCompletingChoreId(null); setProofImage(null); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 space-y-4 sm:space-y-5">
        {/* Wallet hero */}
        <section className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 sm:p-8 rounded-2xl shadow-lg text-white">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="opacity-75 text-xs sm:text-sm uppercase tracking-wider mb-1">הארנק שלי</p>
              <div className="text-5xl sm:text-6xl font-black flex items-center gap-2">
                {childConfig?.balance || 0}
                <Coins className="text-yellow-300 w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <p className="opacity-70 text-xs sm:text-sm mt-1">מטבעות שנצברו</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl sm:text-4xl mb-1">{childConfig?.avatar || '🧒'}</div>
              {(childConfig?.streak || 0) > 1 && (
                <div className="bg-white/20 rounded-xl px-2 sm:px-3 py-1 text-center">
                  <div className="text-lg sm:text-xl font-black">🔥{childConfig.streak}</div>
                  <div className="text-xs opacity-80">ימים ברצף</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Rejection feedback */}
        {rejected.length > 0 && (
          <section className="bg-red-50 p-4 sm:p-5 rounded-2xl border border-red-200">
            <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <X className="w-4 h-4" />חזרו אלייך לתיקון
            </h3>
            {rejected.map((c) => (
              <div key={c.id} className="bg-white p-3 rounded-xl border border-red-100 mb-2">
                <p className="font-bold text-gray-800 text-sm sm:text-base">{c.title}</p>
                <p className="text-xs sm:text-sm text-red-600 mt-1"><span className="font-bold">הורה:</span> {c.rejectionNote}</p>
                <button onClick={() => setCompletingChoreId(c.id)} className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1.5 px-4 rounded-lg transition-colors">שלח שוב</button>
              </div>
            ))}
          </section>
        )}

        {/* Open chores */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-lg sm:text-xl">
            <CheckCircle className="text-emerald-500 w-5 h-5 sm:w-6 sm:h-6" />מטלות פתוחות
          </h3>
          <div className="space-y-3">
            {availableChores.filter((c) => !c.rejectionNote).map((chore) => (
              <div key={chore.id} className="bg-gray-50 p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 hover:border-emerald-200 transition-colors">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm sm:text-base">{chore.title}</h4>
                  <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                    {chore.reward}<Coins className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />מטבעות
                  </p>
                </div>
                <button onClick={() => setCompletingChoreId(chore.id)}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2 sm:py-2.5 px-5 sm:px-6 rounded-xl flex items-center justify-center gap-2 transition-all text-sm sm:text-base shrink-0">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />עשיתי!
                </button>
              </div>
            ))}
            {availableChores.filter((c) => !c.rejectionNote).length === 0 && (
              <p className="text-center text-gray-400 py-6 text-base sm:text-lg">🎉 אין מטלות פתוחות כרגע!</p>
            )}
          </div>
        </section>

        {/* Pending approval */}
        {myPending.length > 0 && (
          <section className="bg-orange-50 p-4 sm:p-5 rounded-2xl border border-orange-200">
            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />ממתינות לאישור ({myPending.length})
            </h3>
            {myPending.map((c) => (
              <div key={c.id} className="bg-white p-3 rounded-xl border border-orange-100 flex justify-between items-center mb-2 last:mb-0 gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{c.title}</p>
                  <p className="text-xs text-orange-500">{c.reward}🪙 בהמתנה...</p>
                </div>
                {c.proofImage && <img src={c.proofImage} alt="הוכחה" className="h-10 w-10 object-cover rounded-lg border shrink-0" />}
              </div>
            ))}
          </section>
        )}

        {/* Wishlist */}
        <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border">
          <button onClick={() => setShowWishlist((v) => !v)} className="w-full flex items-center justify-between font-bold">
            <span className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="text-pink-500 w-4 h-4 sm:w-5 sm:h-5" />רשימת המשאלות שלי
            </span>
            {showWishlist ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
          </button>
          {showWishlist && (
            <div className="mt-4 space-y-2">
              {(childConfig?.wishlist || []).map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-pink-50 px-3 py-2 rounded-xl border border-pink-100 gap-2">
                  <span className="text-sm font-bold text-pink-800 flex items-center gap-1 min-w-0">
                    <Heart className="w-3 h-3 text-pink-400 shrink-0" /><span className="truncate">{item.text}</span>
                  </span>
                  <button onClick={() => handleRemoveWishItem(item.id)} className="text-pink-300 hover:text-pink-500 shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <input type="text" value={newWishItem} onChange={(e) => setNewWishItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWishItem()}
                  className="flex-1 p-2 border rounded-xl text-sm min-w-0" placeholder="מה תרצה לקנות?" />
                <button onClick={handleAddWishItem} className="bg-pink-500 hover:bg-pink-600 text-white px-3 sm:px-4 rounded-xl text-sm font-bold transition-colors shrink-0">הוסף</button>
              </div>
            </div>
          )}
        </section>

        {/* Completed history */}
        {myCompleted.length > 0 && (
          <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border">
            <button onClick={() => setShowHistory((v) => !v)} className="w-full flex items-center justify-between font-bold">
              <span className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="text-indigo-400 w-4 h-4 sm:w-5 sm:h-5" />היסטוריית הישגים ({myCompleted.length})
              </span>
              {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
            </button>
            {showHistory && (
              <div className="mt-4 space-y-2 max-h-40 sm:max-h-64 overflow-y-auto">
                {myCompleted.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 gap-2">
                    <span className="flex items-center gap-1 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </span>
                    <span className="text-emerald-600 font-bold shrink-0">+{c.reward}🪙</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
