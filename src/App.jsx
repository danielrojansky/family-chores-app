import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle, Clock, Plus, User, Users, Coins, LogOut,
  Check, X, RefreshCw, Wallet, ShieldCheck, Settings,
  Trash2, Lock, ArrowRight, Delete, Star, Gift, History,
  Zap, Heart, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, onSnapshot,
  collection, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';

// ─── Firebase ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const APP_ID = import.meta.env.VITE_APP_ID || 'family-chores-app';

const configRef = () => doc(db, 'artifacts', APP_ID, 'public', 'data', 'config', 'main');
const choresCol = () => collection(db, 'artifacts', APP_ID, 'public', 'data', 'chores');
const choreRef  = (id) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'chores', id);

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐨', '🐸', '🐧', '🦋', '🐬', '🦄', '🐙', '🐲'];
const today   = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
};

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(i => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-12px',
            backgroundColor: colors[i % colors.length],
            animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── PIN Entry ────────────────────────────────────────────────────────────────
function PinEntry({ profile, correctPin, onSuccess, onBack }) {
  const [entered, setEntered] = useState('');
  const [error,   setError]   = useState(false);
  const [shake,   setShake]   = useState(false);

  const handleDigit = useCallback((d) => {
    setEntered(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      if (next.length === 4) {
        if (next === correctPin) {
          setTimeout(onSuccess, 150);
        } else {
          setShake(true); setError(true);
          setTimeout(() => { setEntered(''); setShake(false); setError(false); }, 700);
        }
      }
      return next;
    });
  }, [correctPin, onSuccess]);

  const isParent = profile.type === 'parent';
  const accent   = isParent ? 'bg-indigo-600' : 'bg-emerald-500';
  const dotFill  = isParent ? 'bg-indigo-600 border-indigo-600' : 'bg-emerald-500 border-emerald-500';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-8 text-center">
        <div className={`w-16 h-16 ${accent} rounded-full flex items-center justify-center mx-auto mb-4 text-3xl`}>
          {isParent ? <ShieldCheck className="w-8 h-8 text-white" /> : (profile.avatar || '🧒')}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">שלום, {profile.name}</h2>
        <p className="text-sm text-gray-400 mb-6 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> הכנס קוד כניסה
        </p>
        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-6 ${shake ? 'animate-bounce' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < entered.length ? dotFill : error ? 'border-red-400 bg-red-100' : 'border-gray-300'
            }`} />
          ))}
        </div>
        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleDigit(String(n))}
              className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-xl font-bold text-gray-800 border border-gray-200 transition-all">
              {n}
            </button>
          ))}
          <button onClick={onBack} className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 flex items-center justify-center">
            <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => handleDigit('0')} className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-xl font-bold text-gray-800 border border-gray-200 transition-all">0</button>
          <button onClick={() => setEntered(e => e.slice(0, -1))} className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 flex items-center justify-center">
            <Delete className="w-5 h-5" />
          </button>
        </div>
        {error && <p className="text-red-500 text-sm font-bold mt-2">קוד שגוי, נסה שוב 🔒</p>}
      </div>
    </div>
  );
}

// ─── Bonus Coins Modal ────────────────────────────────────────────────────────
function BonusModal({ kid, onConfirm, onClose }) {
  const [amount, setAmount] = useState('');
  const [note,   setNote]   = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div dir="rtl" className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
        <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
          <Star className="text-yellow-500 w-5 h-5" /> בונוס מיוחד ל{kid.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">הוסף מטבעות בגין מאמץ מיוחד, עזרה, יום הולדת...</p>
        <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
          className="w-full p-3 border rounded-xl mb-3 text-center text-2xl font-bold" placeholder="כמה מטבעות?" autoFocus />
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4" placeholder="סיבה (אופציונלי)" />
        <div className="flex gap-2">
          <button onClick={() => onConfirm(parseInt(amount) || 0, note)} disabled={!amount || parseInt(amount) < 1}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-bold p-3 rounded-xl transition-colors">
            הוסף <Coins className="inline w-4 h-4" />
          </button>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl transition-colors">ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject with Note Modal ───────────────────────────────────────────────────
function RejectModal({ chore, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div dir="rtl" className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
        <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
          <X className="text-red-500 w-5 h-5" /> דחיית מטלה
        </h3>
        <p className="text-gray-600 mb-1 font-bold">{chore.title}</p>
        <p className="text-sm text-gray-500 mb-4">כתוב הסבר קצר לילד — הוא יראה את ההודעה</p>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4 resize-none h-24" placeholder="למשל: הספה לא מסודרת מספיק, נסה שוב" autoFocus />
        <div className="flex gap-2">
          <button onClick={() => onConfirm(note)}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold p-3 rounded-xl transition-colors">
            שלח דחייה
          </button>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl transition-colors">ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authUser,        setAuthUser]        = useState(null);
  const [loadingInit,     setLoadingInit]      = useState(true);
  const [familyConfig,    setFamilyConfig]     = useState(null);
  const [chores,          setChores]           = useState([]);
  const [selectedProfile, setSelectedProfile]  = useState(null);
  const [currentProfile,  setCurrentProfile]   = useState(null);
  const [activeTab,       setActiveTab]         = useState('dashboard');

  // Parent UI state
  const [newChore,     setNewChore]     = useState({ title: '', reward: '', assignedTo: 'all', isRecurring: false });
  const [bonusTarget,  setBonusTarget]  = useState(null);   // kid object for bonus modal
  const [rejectTarget, setRejectTarget] = useState(null);   // chore object for reject modal

  // Kid UI state
  const [completingChoreId, setCompletingChoreId] = useState(null);
  const [proofImage,        setProofImage]         = useState(null);
  const [showConfetti,      setShowConfetti]        = useState(false);
  const [showHistory,       setShowHistory]         = useState(false);
  const [showWishlist,      setShowWishlist]         = useState(false);
  const [newWishItem,       setNewWishItem]          = useState('');

  // Setup
  const [setupData, setSetupData] = useState({
    parent1: 'אבא', parent2: 'אמא', parentPin: '',
    kids: [{ id: 'k1', name: 'ילד 1', balance: 0, pin: '', avatar: '🦁' }],
  });

  const fileInputRef  = useRef(null);
  const prevChoresRef = useRef([]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error('Auth error:', err));
    const unsub = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (!user) setLoadingInit(false);
    });
    return unsub;
  }, []);

  // ── Firestore ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const unsubConfig = onSnapshot(configRef(), snap => {
      setFamilyConfig(snap.exists() ? snap.data() : { isSetup: false, parents: [], kids: [] });
      setLoadingInit(false);
    });
    const unsubChores = onSnapshot(choresCol(), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setChores(data);
    });
    return () => { unsubConfig(); unsubChores(); };
  }, [authUser]);

  // Sync currentProfile with config updates (e.g. balance changes)
  useEffect(() => {
    if (!currentProfile || !familyConfig) return;
    if (currentProfile.type === 'kid') {
      const updated = familyConfig.kids.find(k => k.id === currentProfile.id);
      if (updated) setCurrentProfile(prev => ({ ...prev, ...updated }));
    }
    if (currentProfile.type === 'parent') {
      const updated = familyConfig.parents.find(p => p.id === currentProfile.id);
      if (updated) setCurrentProfile(prev => ({ ...prev, ...updated }));
    }
  }, [familyConfig]); // eslint-disable-line

  // Confetti: detect when one of this kid's chores gets approved
  useEffect(() => {
    if (!currentProfile || currentProfile.type !== 'kid') return;
    const newlyApproved = chores.filter(c =>
      c.status === 'approved' &&
      c.completedBy === currentProfile.id &&
      !prevChoresRef.current.find(p => p.id === c.id && p.status === 'approved')
    );
    if (newlyApproved.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
    prevChoresRef.current = chores;
  }, [chores]); // eslint-disable-line

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const appendActivity = (config, entry) => {
    const log = config.activityLog || [];
    return [entry, ...log].slice(0, 30);
  };

  const calcStreak = (kid) => {
    const t = today();
    const y = yesterday();
    if (!kid.lastStreakDate) return 1;
    if (kid.lastStreakDate === t) return kid.streak || 1;        // already counted today
    if (kid.lastStreakDate === y) return (kid.streak || 0) + 1; // consecutive day
    return 1; // streak broken
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSetupFamily = async (e) => {
    e.preventDefault();
    if (!setupData.parentPin || setupData.parentPin.length !== 4) {
      alert('נדרש קוד הורים בן 4 ספרות');
      return;
    }
    const parents = [];
    if (setupData.parent1.trim()) parents.push({ id: 'p1', name: setupData.parent1.trim() });
    if (setupData.parent2.trim()) parents.push({ id: 'p2', name: setupData.parent2.trim() });
    await setDoc(configRef(), {
      isSetup: true,
      parentPin: setupData.parentPin,
      parents,
      activityLog: [],
      kids: setupData.kids.filter(k => k.name.trim()).map(k => ({
        ...k, name: k.name.trim(),
        pin: k.pin || null,
        avatar: k.avatar || '🦁',
        balance: 0, streak: 0, lastStreakDate: null,
        wishlist: [],
      })),
    });
  };

  const handleUpdateFamily = async (updatedParents, updatedKids) => {
    await updateDoc(configRef(), { parents: updatedParents, kids: updatedKids });
    setActiveTab('dashboard');
  };

  const handleUpdatePins = async (parentPin, updatedKids) => {
    await updateDoc(configRef(), { parentPin, kids: updatedKids });
    setActiveTab('dashboard');
  };

  const handleAddChore = async (e) => {
    e.preventDefault();
    if (!newChore.title || !newChore.reward) return;
    await addDoc(choresCol(), {
      title: newChore.title, reward: parseInt(newChore.reward) || 0,
      assignedTo: newChore.assignedTo, status: 'open',
      completedBy: null, isRecurring: newChore.isRecurring,
      proofImage: null, rejectionNote: null, createdAt: Date.now(),
    });
    setNewChore({ title: '', reward: '', assignedTo: 'all', isRecurring: false });
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale  = 500 / img.width;
        canvas.width = 500; canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setProofImage(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submitChoreCompletion = async () => {
    if (!completingChoreId) return;
    await updateDoc(choreRef(completingChoreId), {
      status: 'pending_approval', completedBy: currentProfile.id,
      proofImage: proofImage || null, rejectionNote: null,
    });
    setCompletingChoreId(null); setProofImage(null);
  };

  const handleApproveChore = async (chore) => {
    const kid = familyConfig.kids.find(k => k.id === chore.completedBy);
    if (!kid) return;
    const newStreak = calcStreak(kid);
    const updatedKids = familyConfig.kids.map(k =>
      k.id === chore.completedBy
        ? { ...k, balance: (k.balance || 0) + chore.reward, streak: newStreak, lastStreakDate: today() }
        : k
    );
    const logEntry = { type: 'approved', choreTitle: chore.title, kidName: kid.name, at: Date.now(), reward: chore.reward };
    await Promise.all([
      updateDoc(configRef(), { kids: updatedKids, activityLog: appendActivity(familyConfig, logEntry) }),
      updateDoc(choreRef(chore.id), { status: 'approved', approvedAt: Date.now() }),
    ]);
  };

  const handleRejectChore = async (chore, note = '') => {
    const kid     = familyConfig.kids.find(k => k.id === chore.completedBy);
    const logEntry = { type: 'rejected', choreTitle: chore.title, kidName: kid?.name || '?', at: Date.now(), note };
    await Promise.all([
      updateDoc(configRef(), { activityLog: appendActivity(familyConfig, logEntry) }),
      updateDoc(choreRef(chore.id), { status: 'open', completedBy: null, proofImage: null, rejectionNote: note || null }),
    ]);
    setRejectTarget(null);
  };

  const handleBonusCoins = async (kidId, amount, note) => {
    if (!amount || amount < 1) return;
    const kid = familyConfig.kids.find(k => k.id === kidId);
    const updatedKids = familyConfig.kids.map(k =>
      k.id === kidId ? { ...k, balance: (k.balance || 0) + amount } : k
    );
    const logEntry = { type: 'bonus', kidName: kid?.name || '?', at: Date.now(), reward: amount, note };
    await updateDoc(configRef(), {
      kids: updatedKids,
      activityLog: appendActivity(familyConfig, logEntry),
    });
    setBonusTarget(null);
  };

  const handleResetRecurring = async () => {
    const recurring = chores.filter(c => c.isRecurring);
    await Promise.all(
      recurring.map(c => updateDoc(choreRef(c.id), { status: 'open', completedBy: null, proofImage: null, rejectionNote: null }))
    );
  };

  const handleDeleteChore   = async (id) => deleteDoc(choreRef(id));

  const handlePayout = async (kidId) => {
    const updatedKids = familyConfig.kids.map(k => k.id === kidId ? { ...k, balance: 0 } : k);
    await updateDoc(configRef(), { kids: updatedKids });
  };

  const handleAddWishItem = async () => {
    if (!newWishItem.trim() || !currentProfile) return;
    const updatedKids = familyConfig.kids.map(k =>
      k.id === currentProfile.id
        ? { ...k, wishlist: [...(k.wishlist || []), { id: 'w' + Date.now(), text: newWishItem.trim() }] }
        : k
    );
    await updateDoc(configRef(), { kids: updatedKids });
    setNewWishItem('');
  };

  const handleRemoveWishItem = async (itemId) => {
    const updatedKids = familyConfig.kids.map(k =>
      k.id === currentProfile.id
        ? { ...k, wishlist: (k.wishlist || []).filter(w => w.id !== itemId) }
        : k
    );
    await updateDoc(configRef(), { kids: updatedKids });
  };

  const logout = () => { setCurrentProfile(null); setSelectedProfile(null); setActiveTab('dashboard'); };

  const handleSelectProfile = (profile) => {
    if (profile.type === 'kid') {
      const kidConfig = familyConfig.kids.find(k => k.id === profile.id);
      if (!kidConfig?.pin) { setSelectedProfile(profile); setCurrentProfile(profile); return; }
    }
    setSelectedProfile(profile);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingInit) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  // ── VIEW 1: Setup ────────────────────────────────────────────────────────────
  if (familyConfig && !familyConfig.isSetup) return (
    <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-indigo-900 mb-1">הגדרת משפחה 👋</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">הגדרה חד-פעמית — הכל נשמר בענן</p>
        <form onSubmit={handleSetupFamily} className="space-y-6">
          {/* Parents */}
          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">הורים</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="text" value={setupData.parent1} onChange={e => setSetupData({...setupData, parent1: e.target.value})} className="p-3 border rounded-xl" placeholder="הורה 1" />
              <input type="text" value={setupData.parent2} onChange={e => setSetupData({...setupData, parent2: e.target.value})} className="p-3 border rounded-xl" placeholder="הורה 2 (אופציונלי)" />
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
                <Lock className="w-4 h-4" /> קוד הורים — 4 ספרות (חובה)
              </label>
              <input type="password" inputMode="numeric" maxLength={4} required value={setupData.parentPin}
                onChange={e => setSetupData({...setupData, parentPin: e.target.value.replace(/\D/g,'').slice(0,4)})}
                className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em]" placeholder="••••" />
              <p className="text-xs text-indigo-600 mt-2">ילדים לא יוכלו להיכנס כהורים ללא קוד זה</p>
            </div>
          </div>
          {/* Kids */}
          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">ילדים</h3>
            {setupData.kids.map((kid, idx) => (
              <div key={kid.id} className="mb-4 p-3 border rounded-xl bg-gray-50">
                <div className="flex gap-2 mb-2">
                  <input type="text" required value={kid.name}
                    onChange={e => { const kids=[...setupData.kids]; kids[idx]={...kids[idx],name:e.target.value}; setSetupData({...setupData,kids}); }}
                    className="flex-1 p-3 border rounded-xl bg-white" placeholder={`שם ילד ${idx+1}`} />
                  <input type="password" inputMode="numeric" maxLength={4} value={kid.pin}
                    onChange={e => { const kids=[...setupData.kids]; kids[idx]={...kids[idx],pin:e.target.value.replace(/\D/g,'').slice(0,4)}; setSetupData({...setupData,kids}); }}
                    className="w-24 p-3 border rounded-xl bg-white text-center tracking-widest" placeholder="קוד" />
                </div>
                {/* Avatar picker */}
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button key={a} type="button" onClick={() => { const kids=[...setupData.kids]; kids[idx]={...kids[idx],avatar:a}; setSetupData({...setupData,kids}); }}
                      className={`text-xl p-1 rounded-lg border-2 transition-all ${kid.avatar===a ? 'border-indigo-500 bg-indigo-50 scale-110' : 'border-transparent hover:border-gray-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSetupData({...setupData, kids:[...setupData.kids,{id:'k'+Date.now(),name:'',balance:0,pin:'',avatar:'🦁'}]})}
                className="text-indigo-600 text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/>הוסף ילד</button>
              {setupData.kids.length > 1 && (
                <button type="button" onClick={() => setSetupData({...setupData, kids:setupData.kids.slice(0,-1)})}
                  className="text-red-400 text-sm font-bold flex items-center gap-1"><Trash2 className="w-4 h-4"/>הסר</button>
              )}
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-md text-lg transition-colors">
            שמור והתחל 🚀
          </button>
        </form>
      </div>
    </div>
  );

  // ── VIEW 2: Profile picker ────────────────────────────────────────────────────
  if (!selectedProfile) return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">מי משתמש כעת? 🏠</h1>
        <p className="text-sm text-gray-400 mb-6">בחר פרופיל להמשך</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {familyConfig?.parents.map(p => (
            <button key={p.id} onClick={() => handleSelectProfile({type:'parent',...p})}
              className="p-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors flex flex-col items-center gap-1">
              <ShieldCheck className="w-7 h-7" />{p.name}
              <span className="text-xs font-normal text-indigo-500 flex items-center gap-1"><Lock className="w-3 h-3"/>דרוש קוד</span>
            </button>
          ))}
        </div>
        <div className="border-t pt-6 grid gap-3">
          {familyConfig?.kids.map(k => (
            <button key={k.id} onClick={() => handleSelectProfile({type:'kid',...k})}
              className="p-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{k.avatar || '🧒'}</span>
                <div className="text-right">
                  <div>{k.name}</div>
                  <div className="text-xs text-emerald-600 font-normal flex items-center gap-1">
                    {k.balance||0} <Coins className="w-3 h-3 text-yellow-500"/>
                    {(k.streak||0) > 1 && <span className="text-orange-500 mr-2">🔥{k.streak}</span>}
                  </div>
                </div>
              </div>
              {k.pin && <span className="text-xs text-emerald-500 flex items-center gap-1"><Lock className="w-3 h-3"/>קוד</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── VIEW 3: PIN entry ─────────────────────────────────────────────────────────
  if (selectedProfile && !currentProfile) {
    const correctPin = selectedProfile.type === 'parent'
      ? familyConfig.parentPin
      : familyConfig.kids.find(k => k.id === selectedProfile.id)?.pin;
    return (
      <PinEntry profile={selectedProfile} correctPin={correctPin}
        onSuccess={() => setCurrentProfile(selectedProfile)}
        onBack={() => setSelectedProfile(null)} />
    );
  }

  // ── Shared Header ─────────────────────────────────────────────────────────────
  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${currentProfile.type==='parent' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
            {currentProfile.type === 'parent' ? <ShieldCheck className="w-5 h-5 text-indigo-600"/> : (currentProfile.avatar||'🧒')}
          </div>
          <div>
            <p className="font-bold leading-tight">שלום, {currentProfile.name}</p>
            <p className="text-xs text-gray-400">{currentProfile.type==='parent' ? 'הורה' : 'ילד/ה'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {currentProfile.type === 'parent' && (
            <button onClick={() => setActiveTab(t => t==='settings' ? 'dashboard' : 'settings')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5"/>
            </button>
          )}
          <button onClick={logout} className="p-2 text-red-400 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors text-sm">
            <LogOut className="w-4 h-4"/><span className="hidden sm:inline">החלף</span>
          </button>
        </div>
      </div>
    </header>
  );

  // ── VIEW 4: Parent Settings ───────────────────────────────────────────────────
  if (currentProfile.type === 'parent' && activeTab === 'settings') return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
      <Header/>
      <main className="max-w-xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><Users className="text-indigo-600 w-5 h-5"/>עריכת בני משפחה</h2>
          <FamilySettingsForm initialConfig={familyConfig} onSave={handleUpdateFamily} onCancel={() => setActiveTab('dashboard')}/>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><Lock className="text-indigo-600 w-5 h-5"/>ניהול קודי כניסה</h2>
          <PinSettingsForm initialConfig={familyConfig} onSave={handleUpdatePins} onCancel={() => setActiveTab('dashboard')}/>
        </div>
      </main>
    </div>
  );

  // ── VIEW 5: Parent Dashboard ──────────────────────────────────────────────────
  if (currentProfile.type === 'parent') {
    const pendingChores = chores.filter(c => c.status === 'pending_approval');
    const statusLabel   = { open:'פתוח', pending_approval:'ממתין', approved:'הושלם' };
    const activityLog   = familyConfig.activityLog || [];

    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
        <Header/>
        {bonusTarget  && <BonusModal kid={bonusTarget} onConfirm={(a,n) => handleBonusCoins(bonusTarget.id,a,n)} onClose={() => setBonusTarget(null)}/>}
        {rejectTarget && <RejectModal chore={rejectTarget} onConfirm={note => handleRejectChore(rejectTarget, note)} onClose={() => setRejectTarget(null)}/>}
        <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

          {/* Wallets */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Wallet className="text-indigo-500 w-5 h-5"/>ארנקים</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {familyConfig.kids.map(k => (
                <div key={k.id} className="bg-gray-50 p-4 rounded-xl border text-center">
                  <div className="text-3xl mb-1">{k.avatar||'🧒'}</div>
                  <div className="font-bold text-sm">{k.name}</div>
                  {(k.streak||0) > 1 && <div className="text-xs text-orange-500 mb-1">🔥 {k.streak} ימים</div>}
                  <div className="text-2xl font-black text-emerald-600 my-2 flex justify-center items-center gap-1">
                    {k.balance||0}<Coins className="w-5 h-5 text-yellow-500"/>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handlePayout(k.id)} disabled={!k.balance}
                      className="flex-1 text-xs bg-white border p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                      תשלום
                    </button>
                    <button onClick={() => setBonusTarget(k)}
                      className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 p-1.5 rounded-lg hover:bg-yellow-100 transition-colors">
                      <Star className="w-3 h-3"/>
                    </button>
                  </div>
                  {/* Wishlist preview */}
                  {(k.wishlist||[]).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                      <p className="font-bold text-gray-600 mb-1 flex items-center gap-1"><Gift className="w-3 h-3"/>רשימת משאלות</p>
                      {k.wishlist.map(w => <div key={w.id} className="text-right">• {w.text}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: add chore + reset */}
            <div className="space-y-4">
              <section className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="text-indigo-500 w-5 h-5"/>מטלה חדשה</h3>
                <form onSubmit={handleAddChore} className="space-y-3">
                  <input type="text" required value={newChore.title} onChange={e => setNewChore({...newChore,title:e.target.value})} className="w-full p-3 border rounded-xl" placeholder="שם המטלה"/>
                  <input type="number" required min="1" value={newChore.reward} onChange={e => setNewChore({...newChore,reward:e.target.value})} className="w-full p-3 border rounded-xl" placeholder="בונוס במטבעות"/>
                  <select value={newChore.assignedTo} onChange={e => setNewChore({...newChore,assignedTo:e.target.value})} className="w-full p-3 border rounded-xl">
                    <option value="all">לכל הילדים</option>
                    {familyConfig.kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <input type="checkbox" checked={newChore.isRecurring} onChange={e => setNewChore({...newChore,isRecurring:e.target.checked})} className="w-4 h-4"/>
                    מטלה יומית קבועה
                  </label>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors">הוסף</button>
                </form>
              </section>
              <button onClick={handleResetRecurring} className="w-full bg-gray-200 hover:bg-gray-300 p-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4"/>אפס מטלות יומיות
              </button>

              {/* Activity Log */}
              {activityLog.length > 0 && (
                <section className="bg-white p-5 rounded-2xl shadow-sm border">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-sm"><History className="text-indigo-400 w-4 h-4"/>פעילות אחרונה</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activityLog.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0">
                        <span className="text-lg mt-0.5">
                          {e.type==='approved' ? '✅' : e.type==='rejected' ? '❌' : '⭐'}
                        </span>
                        <div>
                          <p className="font-bold text-gray-700">
                            {e.kidName} — {e.choreTitle||'בונוס'}
                            {e.reward && <span className="text-emerald-600"> +{e.reward}🪙</span>}
                          </p>
                          {e.note && <p className="text-gray-500 italic">"{e.note}"</p>}
                          <p className="text-gray-400">{new Date(e.at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right: pending + all chores */}
            <div className="lg:col-span-2 space-y-6">
              {pendingChores.length > 0 && (
                <section className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                  <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5"/>ממתינים לאישור ({pendingChores.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingChores.map(chore => {
                      const kid = familyConfig.kids.find(k => k.id === chore.completedBy);
                      return (
                        <div key={chore.id} className="bg-white p-4 rounded-xl border border-orange-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{kid?.avatar||'🧒'}</span>
                              <div>
                                <h4 className="font-bold">{chore.title}</h4>
                                <p className="text-sm text-gray-500">{kid?.name} | {chore.reward} <Coins className="inline w-3 h-3"/></p>
                              </div>
                            </div>
                            {chore.proofImage && (
                              <img src={chore.proofImage} alt="הוכחה"
                                className="h-20 mt-2 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(chore.proofImage)}/>
                            )}
                          </div>
                          <div className="flex gap-2 w-full md:w-auto shrink-0">
                            <button onClick={() => handleApproveChore(chore)}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg flex justify-center items-center gap-1 transition-colors">
                              <Check className="w-4 h-4"/>אישור
                            </button>
                            <button onClick={() => setRejectTarget(chore)}
                              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg flex justify-center items-center gap-1 transition-colors">
                              <X className="w-4 h-4"/>דחייה
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="text-indigo-500 w-5 h-5"/>כל המטלות</h3>
                <div className="space-y-2">
                  {chores.map(chore => (
                    <div key={chore.id} className="p-3 border rounded-xl flex items-center justify-between bg-gray-50 group hover:bg-gray-100 transition-colors">
                      <div>
                        <span className={`font-bold text-sm ${chore.status==='approved' ? 'line-through text-gray-400' : ''}`}>
                          {chore.title} {chore.isRecurring && <RefreshCw className="w-3 h-3 inline text-indigo-400"/>}
                        </span>
                        <p className="text-xs text-gray-500">
                          {chore.assignedTo==='all' ? 'כולם' : familyConfig.kids.find(k=>k.id===chore.assignedTo)?.name} | {chore.reward}🪙
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          chore.status==='open' ? 'bg-blue-100 text-blue-700' :
                          chore.status==='pending_approval' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>{statusLabel[chore.status]}</span>
                        {chore.status==='open' && (
                          <button onClick={() => handleDeleteChore(chore.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {chores.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">אין מטלות עדיין</p>}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── VIEW 6: Child Dashboard ───────────────────────────────────────────────────
  const childConfig     = familyConfig.kids.find(k => k.id === currentProfile.id);
  const availableChores = chores.filter(c => c.status==='open' && (c.assignedTo==='all' || c.assignedTo===currentProfile.id));
  const myPending       = chores.filter(c => c.status==='pending_approval' && c.completedBy===currentProfile.id);
  const myCompleted     = chores.filter(c => c.status==='approved' && c.completedBy===currentProfile.id);
  // Open chores that were previously rejected (have a rejection note)
  const rejected        = availableChores.filter(c => c.rejectionNote);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
      <Header/>
      {showConfetti && <Confetti/>}

      {/* Photo proof modal */}
      {completingChoreId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="font-bold text-xl mb-1">תמונה להורים? 📷</h3>
            <p className="text-sm text-gray-400 mb-4">אופציונלי — תמונה כהוכחה</p>
            <div className="relative border-2 border-dashed rounded-xl bg-gray-50 h-40 mb-4 flex items-center justify-center overflow-hidden">
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
              {proofImage
                ? <img src={proofImage} className="w-full h-full object-cover" alt="הוכחה"/>
                : <span className="text-gray-400 text-sm pointer-events-none">לחצו לצלם תמונה</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={submitChoreCompletion} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-3 rounded-xl transition-colors">שליחה ✅</button>
              <button onClick={() => {setCompletingChoreId(null);setProofImage(null);}} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-5">
        {/* Wallet + streak */}
        <section className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-2xl shadow-lg text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="opacity-75 text-sm uppercase tracking-wider mb-1">הארנק שלי</p>
              <div className="text-6xl font-black flex items-center gap-2">
                {childConfig?.balance||0}<Coins className="text-yellow-300 w-12 h-12"/>
              </div>
              <p className="opacity-70 text-sm mt-1">מטבעות שנצברו</p>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-1">{childConfig?.avatar||'🧒'}</div>
              {(childConfig?.streak||0) > 1 && (
                <div className="bg-white/20 rounded-xl px-3 py-1 text-center">
                  <div className="text-xl font-black">🔥{childConfig.streak}</div>
                  <div className="text-xs opacity-80">ימים ברצף</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Rejection notes (open chores that were sent back) */}
        {rejected.length > 0 && (
          <section className="bg-red-50 p-5 rounded-2xl border border-red-200">
            <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2"><X className="w-4 h-4"/>חזרו אלייך לתיקון</h3>
            {rejected.map(c => (
              <div key={c.id} className="bg-white p-3 rounded-xl border border-red-100 mb-2">
                <p className="font-bold text-gray-800">{c.title}</p>
                <p className="text-sm text-red-600 flex items-start gap-1 mt-1">
                  <span className="font-bold">הורה:</span> {c.rejectionNote}
                </p>
                <button onClick={() => setCompletingChoreId(c.id)}
                  className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1.5 px-4 rounded-lg transition-colors">
                  שלח שוב
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Open chores */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-xl"><CheckCircle className="text-emerald-500 w-6 h-6"/>מטלות פתוחות</h3>
          <div className="space-y-3">
            {availableChores.filter(c => !c.rejectionNote).map(chore => (
              <div key={chore.id} className="bg-gray-50 p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-emerald-200 transition-colors">
                <div>
                  <h4 className="font-bold">{chore.title}</h4>
                  <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">{chore.reward}<Coins className="w-4 h-4 text-yellow-500"/>מטבעות</p>
                </div>
                <button onClick={() => setCompletingChoreId(chore.id)}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Check className="w-5 h-5"/>עשיתי!
                </button>
              </div>
            ))}
            {availableChores.filter(c=>!c.rejectionNote).length === 0 && (
              <p className="text-center text-gray-400 py-6 text-lg">🎉 אין מטלות פתוחות כרגע!</p>
            )}
          </div>
        </section>

        {/* Pending */}
        {myPending.length > 0 && (
          <section className="bg-orange-50 p-5 rounded-2xl border border-orange-200">
            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><Clock className="w-5 h-5"/>ממתינות לאישור ({myPending.length})</h3>
            {myPending.map(c => (
              <div key={c.id} className="bg-white p-3 rounded-xl border border-orange-100 flex justify-between items-center mb-2 last:mb-0">
                <div>
                  <p className="font-bold text-sm">{c.title}</p>
                  <p className="text-xs text-orange-500">{c.reward}🪙 בהמתנה...</p>
                </div>
                {c.proofImage && <img src={c.proofImage} alt="הוכחה" className="h-10 w-10 object-cover rounded-lg border"/>}
              </div>
            ))}
          </section>
        )}

        {/* Wishlist */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border">
          <button onClick={() => setShowWishlist(v=>!v)} className="w-full flex items-center justify-between font-bold text-lg">
            <span className="flex items-center gap-2"><Gift className="text-pink-500 w-5 h-5"/>רשימת המשאלות שלי</span>
            {showWishlist ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
          </button>
          {showWishlist && (
            <div className="mt-4 space-y-2">
              {(childConfig?.wishlist||[]).map(item => (
                <div key={item.id} className="flex justify-between items-center bg-pink-50 px-3 py-2 rounded-xl border border-pink-100">
                  <span className="text-sm font-bold text-pink-800 flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400"/>{item.text}</span>
                  <button onClick={() => handleRemoveWishItem(item.id)} className="text-pink-300 hover:text-pink-500"><X className="w-4 h-4"/></button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <input type="text" value={newWishItem} onChange={e => setNewWishItem(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleAddWishItem()}
                  className="flex-1 p-2 border rounded-xl text-sm" placeholder="מה תרצה לקנות?"/>
                <button onClick={handleAddWishItem} className="bg-pink-500 hover:bg-pink-600 text-white px-4 rounded-xl text-sm font-bold transition-colors">הוסף</button>
              </div>
            </div>
          )}
        </section>

        {/* History */}
        {myCompleted.length > 0 && (
          <section className="bg-white p-5 rounded-2xl shadow-sm border">
            <button onClick={() => setShowHistory(v=>!v)} className="w-full flex items-center justify-between font-bold">
              <span className="flex items-center gap-2"><TrendingUp className="text-indigo-400 w-5 h-5"/>היסטוריית הישגים ({myCompleted.length})</span>
              {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
            </button>
            {showHistory && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {myCompleted.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500"/>{c.title}</span>
                    <span className="text-emerald-600 font-bold">+{c.reward}🪙</span>
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

// ─── Family Settings Form ─────────────────────────────────────────────────────
function FamilySettingsForm({ initialConfig, onSave, onCancel }) {
  const [parents, setParents] = useState([...initialConfig.parents]);
  const [kids,    setKids]    = useState(initialConfig.kids.map(k=>({...k})));

  const handleSave = (e) => {
    e.preventDefault();
    onSave(parents.filter(p=>p.name.trim()), kids.filter(k=>k.name.trim()));
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <h3 className="font-bold mb-2 text-gray-700">הורים</h3>
        {parents.map((p,i) => (
          <input key={i} type="text" value={p.name}
            onChange={e => { const np=[...parents]; np[i]={...np[i],name:e.target.value}; setParents(np); }}
            className="w-full p-3 border rounded-xl mb-2" placeholder="שם הורה"/>
        ))}
        {parents.length < 2 && (
          <button type="button" onClick={() => setParents([...parents,{id:'p'+Date.now(),name:''}])}
            className="text-sm text-indigo-600 font-bold">+ הוסף הורה</button>
        )}
      </div>
      <div>
        <h3 className="font-bold mb-2 text-gray-700">ילדים</h3>
        {kids.map((k,i) => (
          <div key={k.id} className="mb-3 p-3 border rounded-xl bg-gray-50">
            <div className="flex gap-2 mb-2">
              <input type="text" value={k.name}
                onChange={e => { const nk=[...kids]; nk[i]={...nk[i],name:e.target.value}; setKids(nk); }}
                className="flex-1 p-2 border rounded-xl bg-white text-sm" placeholder="שם ילד"/>
              <button type="button" onClick={() => setKids(kids.filter((_,idx)=>idx!==i))}
                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map(a => (
                <button key={a} type="button" onClick={() => { const nk=[...kids]; nk[i]={...nk[i],avatar:a}; setKids(nk); }}
                  className={`text-lg p-1 rounded-lg border-2 transition-all ${k.avatar===a ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:border-gray-300'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setKids([...kids,{id:'k'+Date.now(),name:'',balance:0,pin:null,avatar:'🦁',streak:0,lastStreakDate:null,wishlist:[]}])}
          className="text-sm text-indigo-600 font-bold">+ הוסף ילד</button>
      </div>
      <div className="flex gap-3 pt-4 border-t">
        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors">שמור</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-3 rounded-xl transition-colors">ביטול</button>
      </div>
    </form>
  );
}

// ─── PIN Settings Form ────────────────────────────────────────────────────────
function PinSettingsForm({ initialConfig, onSave, onCancel }) {
  const [parentPin, setParentPin] = useState(initialConfig.parentPin||'');
  const [kids,      setKids]      = useState(initialConfig.kids.map(k=>({...k,pin:k.pin||''})));

  const handleSave = (e) => {
    e.preventDefault();
    if (parentPin.length !== 4) { alert('קוד הורים חייב להיות 4 ספרות'); return; }
    onSave(parentPin, kids.map(k=>({...k, pin: k.pin||null})));
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
          <ShieldCheck className="w-4 h-4"/>קוד הורים (4 ספרות)
        </label>
        <input type="password" inputMode="numeric" maxLength={4} required value={parentPin}
          onChange={e => setParentPin(e.target.value.replace(/\D/g,'').slice(0,4))}
          className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em]" placeholder="••••"/>
      </div>
      <div>
        <h3 className="font-bold mb-1 text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-emerald-600"/>קודי ילדים (אופציונלי)</h3>
        <p className="text-xs text-gray-400 mb-3">השאר ריק = כניסה חופשית</p>
        {kids.map((k,i) => (
          <div key={k.id} className="flex items-center gap-3 mb-3">
            <span className="text-xl">{k.avatar||'🧒'}</span>
            <span className="flex-1 font-bold text-sm text-gray-700">{k.name}</span>
            <input type="password" inputMode="numeric" maxLength={4} value={k.pin}
              onChange={e => { const nk=[...kids]; nk[i]={...nk[i],pin:e.target.value.replace(/\D/g,'').slice(0,4)}; setKids(nk); }}
              className="w-28 p-2 border rounded-xl text-center tracking-widest text-sm" placeholder="ללא קוד"/>
            {k.pin && (
              <button type="button" onClick={() => { const nk=[...kids]; nk[i]={...nk[i],pin:''}; setKids(nk); }}
                className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
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
