import React, { useState } from 'react';
import {
  Clock, Plus, Users, Coins, Check, X, RefreshCw,
  Wallet, Trash2, Star, Gift, TrendingUp, Link2, Copy, Fingerprint,
  Edit3, Calendar, ChevronDown, ChevronUp, Lock,
} from 'lucide-react';
import Header from '../ui/Header';
import BonusModal from '../modals/BonusModal';
import RejectModal from '../modals/RejectModal';
import FamilySettingsForm from '../settings/FamilySettingsForm';
import PinSettingsForm from '../settings/PinSettingsForm';
import { useFamily } from '../../context/FamilyContext';
import { today, calcStreak, appendActivity } from '../../lib/utils';
import { logAction } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { isWebAuthnSupported, registerPasskey, listPasskeys, deletePasskey } from '../../lib/webauthn';

export default function ParentDashboard() {
  const {
    familyId, familyConfig, chores, activeTab, setActiveTab,
    mutateConfig, mutateChores, apiCall,
  } = useFamily();
  const { user } = useAuth();

  const [newChore, setNewChore] = useState({ title: '', reward: '', assignedTo: 'all', isRecurring: false });
  const [bonusTarget, setBonusTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [editingChore, setEditingChore] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [passkeys, setPasskeys] = useState(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // ── Data handlers ─────────────────────────────────────────────────────────
  const handleAddChore = async (e) => {
    e.preventDefault();
    if (!newChore.title || !newChore.reward) return;
    const { title, reward } = newChore; // capture before reset
    await apiCall('addChore', { chore: {
      title, reward: parseInt(reward) || 0,
      assignedTo: newChore.assignedTo, status: 'open', completedBy: null,
      isRecurring: newChore.isRecurring, proofImage: null, rejectionNote: null, createdAt: Date.now(),
    }});
    await mutateChores();
    setNewChore({ title: '', reward: '', assignedTo: 'all', isRecurring: false });
    logAction(familyId, 'chore.created', { title, reward });
  };

  const handleApproveChore = async (chore) => {
    const kid = familyConfig.kids.find((k) => k.id === chore.completedBy); if (!kid) return;
    const updatedKids = familyConfig.kids.map((k) =>
      k.id === chore.completedBy
        ? { ...k, balance: (k.balance || 0) + chore.reward, streak: calcStreak(kid), lastStreakDate: today() }
        : k
    );
    const logEntry = { type: 'approved', choreTitle: chore.title, kidName: kid.name, at: Date.now(), reward: chore.reward };
    await Promise.all([
      apiCall('updateConfig', { patch: { kids: updatedKids, activityLog: appendActivity(familyConfig, logEntry) } }),
      apiCall('updateChore', { id: chore.id, patch: { status: 'approved', approvedAt: Date.now() } }),
    ]);
    await Promise.all([mutateConfig(), mutateChores()]);
    logAction(familyId, 'chore.approved', { choreId: chore.id, choreTitle: chore.title, kidName: kid.name, reward: chore.reward });
  };

  const handleRejectChore = async (chore, note = '') => {
    const kid = familyConfig.kids.find((k) => k.id === chore.completedBy);
    const logEntry = { type: 'rejected', choreTitle: chore.title, kidName: kid?.name || '?', at: Date.now(), note };
    await Promise.all([
      apiCall('updateConfig', { patch: { activityLog: appendActivity(familyConfig, logEntry) } }),
      apiCall('updateChore', { id: chore.id, patch: { status: 'open', completedBy: null, proofImage: null, rejectionNote: note || null } }),
    ]);
    await Promise.all([mutateConfig(), mutateChores()]);
    setRejectTarget(null);
    logAction(familyId, 'chore.rejected', { choreId: chore.id, choreTitle: chore.title, note });
  };

  const handleBonusCoins = async (kidId, amount, note) => {
    if (!amount || amount < 1) return;
    const kid = familyConfig.kids.find((k) => k.id === kidId);
    const updatedKids = familyConfig.kids.map((k) => k.id === kidId ? { ...k, balance: (k.balance || 0) + amount } : k);
    const logEntry = { type: 'bonus', kidName: kid?.name || '?', at: Date.now(), reward: amount, note };
    await apiCall('updateConfig', { patch: { kids: updatedKids, activityLog: appendActivity(familyConfig, logEntry) } });
    await mutateConfig(); setBonusTarget(null);
    logAction(familyId, 'bonus.awarded', { kidId, kidName: kid?.name, amount, note });
  };

  const handleResetRecurring = async () => {
    const recurring = chores.filter((c) => c.isRecurring);
    await Promise.all(
      recurring.map((c) => apiCall('updateChore', { id: c.id, patch: { status: 'open', completedBy: null, proofImage: null, rejectionNote: null } }))
    );
    await mutateChores();
    logAction(familyId, 'chores.recurring_reset', { count: recurring.length });
  };

  const handleDeleteChore = async (id) => { await apiCall('deleteChore', { id }); await mutateChores(); };

  const handleEditChore = async (chore) => {
    if (!editingChore) return;
    await apiCall('updateChore', { id: chore.id, patch: {
      title: editingChore.title,
      reward: parseInt(editingChore.reward) || chore.reward,
      assignedTo: editingChore.assignedTo,
      isRecurring: editingChore.isRecurring,
    }});
    await mutateChores();
    setEditingChore(null);
    logAction(familyId, 'chore.edited', { choreId: chore.id, title: editingChore.title });
  };

  const handlePayout = async (kidId) => {
    const kid = familyConfig.kids.find((k) => k.id === kidId);
    const updatedKids = familyConfig.kids.map((k) => k.id === kidId ? { ...k, balance: 0 } : k);
    await apiCall('updateConfig', { patch: { kids: updatedKids } }); await mutateConfig();
    logAction(familyId, 'payout', { kidId, kidName: kid?.name, amount: kid?.balance || 0 });
  };

  const handleUpdateFamily = async (updatedParents, updatedKids, familyName) => {
    const patch = { parents: updatedParents, kids: updatedKids };
    if (familyName !== undefined) patch.familyName = familyName;
    await apiCall('updateConfig', { patch });
    await mutateConfig(); setActiveTab('dashboard');
  };

  const handleUpdateParentPin = async (parentPin) => {
    await apiCall('updateConfig', { patch: { parentPin } });
    await mutateConfig();
    logAction(familyId, 'pins.parent_updated', {});
  };

  const handleUpdateKidPins = async (updatedKids) => {
    await apiCall('updateConfig', { patch: { kids: updatedKids } });
    await mutateConfig();
    logAction(familyId, 'pins.kids_updated', {});
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await apiCall('createFamilyInvite', { createdBy: 'parent' });
      const url = `${window.location.origin}/invite/${res.code}`;
      setInviteLink(url);
      logAction(familyId, 'invite.created', { code: res.code, by: 'parent' });
    } catch (err) {
      alert(err.message || 'שגיאה ביצירת הזמנה');
    } finally { setInviteLoading(false); }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const handleLoadPasskeys = async () => {
    setPasskeyLoading(true);
    try { const res = await listPasskeys(); setPasskeys(res.passkeys || []); }
    catch { setPasskeyMsg('לא ניתן לטעון מפתחות'); }
    finally { setPasskeyLoading(false); }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true); setPasskeyMsg('');
    try {
      await registerPasskey('מכשיר ' + new Date().toLocaleDateString('he-IL'));
      setPasskeyMsg('מפתח נרשם בהצלחה!');
      await handleLoadPasskeys();
    } catch (err) { setPasskeyMsg(err.message || 'שגיאה ברישום מפתח'); }
    finally { setPasskeyLoading(false); }
  };

  const handleDeletePasskey = async (credId) => {
    setPasskeyLoading(true);
    try { await deletePasskey(credId); await handleLoadPasskeys(); }
    catch { setPasskeyMsg('שגיאה במחיקת מפתח'); }
    finally { setPasskeyLoading(false); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatRelative = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'עכשיו';
    if (mins < 60) return `לפני ${mins} דק׳`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `לפני ${hours} שע׳`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `לפני ${days} ימים`;
    return formatDate(ts);
  };

  // ── Settings view ─────────────────────────────────────────────────────────
  if (activeTab === 'settings') return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
      <Header />
      <main className="max-w-xl mx-auto px-4 mt-4 sm:mt-8 space-y-4 sm:space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2">
            <Users className="text-indigo-600 w-5 h-5" />עריכת משפחה
          </h2>
          <FamilySettingsForm initialConfig={familyConfig} onSave={handleUpdateFamily} onCancel={() => setActiveTab('dashboard')} />
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2">
            <Lock className="text-indigo-600 w-5 h-5" />ניהול קודי כניסה
          </h2>
          {user?.provider === 'google' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-700">
              כהורה שמחובר דרך Google, לא תידרש להזין קוד בכניסה
            </div>
          )}
          <PinSettingsForm initialConfig={familyConfig} onSaveParentPin={handleUpdateParentPin} onSaveKidPins={handleUpdateKidPins} onCancel={() => setActiveTab('dashboard')} />
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2">
            <Link2 className="text-indigo-600 w-5 h-5" />הזמנה לאפליקציה
          </h2>
          <p className="text-sm text-gray-500 mb-4">צור קישור הזמנה לשיתוף עם בני משפחה או חברים</p>
          {inviteLink ? (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-xl border flex items-center gap-2">
                <input type="text" readOnly value={inviteLink} dir="ltr"
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0 font-mono" />
                <button onClick={handleCopyInvite}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors">
                  <Copy className="w-3 h-3" />{inviteCopied ? 'הועתק!' : 'העתק'}
                </button>
              </div>
              {/* Share button for mobile */}
              {navigator.share && (
                <button onClick={() => navigator.share({ title: 'הצטרף למטלות המשפחה', url: inviteLink })}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                  שתף קישור
                </button>
              )}
              <button onClick={() => setInviteLink('')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">צור קישור חדש</button>
            </div>
          ) : (
            <button onClick={handleCreateInvite} disabled={inviteLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Link2 className="w-4 h-4" />{inviteLoading ? 'יוצר...' : 'צור קישור הזמנה'}
            </button>
          )}
        </div>

        {isWebAuthnSupported() && user && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
            <h2 className="text-base sm:text-lg font-bold mb-1 flex items-center gap-2">
              <Fingerprint className="text-indigo-600 w-5 h-5" />כניסה ביומטרית
            </h2>
            <p className="text-sm text-gray-500 mb-4">Face ID, Touch ID, או מפתח אבטחה</p>
            {passkeys === null ? (
              <button onClick={handleLoadPasskeys} disabled={passkeyLoading}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                <Fingerprint className="w-4 h-4" />{passkeyLoading ? 'טוען...' : 'הצג מפתחות כניסה'}
              </button>
            ) : (
              <div className="space-y-3">
                {passkeys.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">אין מפתחות כניסה רשומים</p>
                )}
                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                    <div>
                      <p className="text-sm font-semibold">{pk.deviceName || 'מכשיר'}</p>
                      <p className="text-xs text-slate-400">{new Date(pk.registeredAt).toLocaleDateString('he-IL')}</p>
                    </div>
                    <button onClick={() => handleDeletePasskey(pk.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={handleRegisterPasskey} disabled={passkeyLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                  <Fingerprint className="w-4 h-4" />{passkeyLoading ? 'רושם...' : 'רשום מכשיר חדש'}
                </button>
                {passkeyMsg && <p className={`text-sm text-center font-medium ${passkeyMsg.includes('שגיאה') ? 'text-red-500' : 'text-emerald-600'}`}>{passkeyMsg}</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  // ── Dashboard view ────────────────────────────────────────────────────────
  const pendingChores = chores.filter((c) => c.status === 'pending_approval');
  const openChores = chores.filter((c) => c.status === 'open');
  const completedChores = chores.filter((c) => c.status === 'approved');
  const statusLabel = { open: 'פתוח', pending_approval: 'ממתין', approved: 'הושלם' };
  const activityLog = familyConfig.activityLog || [];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-10">
      <Header />
      {bonusTarget && <BonusModal kid={bonusTarget} onConfirm={(a, n) => handleBonusCoins(bonusTarget.id, a, n)} onClose={() => setBonusTarget(null)} />}
      {rejectTarget && <RejectModal chore={rejectTarget} onConfirm={(n) => handleRejectChore(rejectTarget, n)} onClose={() => setRejectTarget(null)} />}

      {/* Edit chore modal */}
      {editingChore && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div dir="rtl" className="bg-white p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Edit3 className="text-indigo-500 w-5 h-5" />עריכת מטלה
            </h3>
            <div className="space-y-3">
              <input type="text" value={editingChore.title}
                onChange={(e) => setEditingChore({ ...editingChore, title: e.target.value })}
                className="w-full p-3 border rounded-xl" placeholder="שם המטלה" />
              <input type="number" min="1" value={editingChore.reward}
                onChange={(e) => setEditingChore({ ...editingChore, reward: e.target.value })}
                className="w-full p-3 border rounded-xl" placeholder="מטבעות" />
              <select value={editingChore.assignedTo}
                onChange={(e) => setEditingChore({ ...editingChore, assignedTo: e.target.value })}
                className="w-full p-3 border rounded-xl">
                <option value="all">לכל הילדים</option>
                {familyConfig.kids?.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input type="checkbox" checked={editingChore.isRecurring}
                  onChange={(e) => setEditingChore({ ...editingChore, isRecurring: e.target.checked })} className="w-4 h-4" />
                מטלה יומית קבועה
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleEditChore(editingChore)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors">שמור</button>
              <button onClick={() => setEditingChore(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
        {/* Wallets */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Wallet className="text-indigo-500 w-5 h-5" />ארנקים</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {familyConfig.kids?.map((k) => (
              <div key={k.id} className="bg-gray-50 p-3 sm:p-4 rounded-xl border text-center hover:shadow-md transition-shadow">
                <div className="text-2xl sm:text-3xl mb-1">{k.avatar || '🧒'}</div>
                <div className="font-bold text-sm">{k.name}</div>
                {(k.streak || 0) > 1 && <div className="text-xs text-orange-500 mb-1">🔥 {k.streak} ימים</div>}
                <div className="text-xl sm:text-2xl font-black text-emerald-600 my-2 flex justify-center items-center gap-1">
                  {k.balance || 0}<Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handlePayout(k.id)} disabled={!k.balance}
                    className="flex-1 text-xs bg-white border p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">תשלום</button>
                  <button onClick={() => setBonusTarget(k)} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 p-1.5 rounded-lg hover:bg-yellow-100 transition-colors">
                    <Star className="w-3 h-3" />
                  </button>
                </div>
                {(k.wishlist || []).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 border-t pt-2 text-right">
                    <p className="font-bold text-gray-600 mb-1 flex items-center gap-1"><Gift className="w-3 h-3" />רשימת משאלות</p>
                    {k.wishlist.map((w) => <div key={w.id} className="truncate">• {w.text}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="space-y-4">
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="text-indigo-500 w-5 h-5" />מטלה חדשה</h3>
              <form onSubmit={handleAddChore} className="space-y-3">
                <input type="text" required value={newChore.title} onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
                  className="w-full p-3 border rounded-xl" placeholder="שם המטלה" />
                <input type="number" required min="1" value={newChore.reward} onChange={(e) => setNewChore({ ...newChore, reward: e.target.value })}
                  className="w-full p-3 border rounded-xl" placeholder="בונוס במטבעות" />
                <select value={newChore.assignedTo} onChange={(e) => setNewChore({ ...newChore, assignedTo: e.target.value })} className="w-full p-3 border rounded-xl">
                  <option value="all">לכל הילדים</option>
                  {familyConfig.kids?.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input type="checkbox" checked={newChore.isRecurring} onChange={(e) => setNewChore({ ...newChore, isRecurring: e.target.checked })} className="w-4 h-4" />
                  מטלה יומית קבועה
                </label>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-all active:scale-[0.98]">הוסף</button>
              </form>
            </section>
            <button onClick={handleResetRecurring} className="w-full bg-gray-200 hover:bg-gray-300 p-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors text-sm active:scale-[0.98]">
              <RefreshCw className="w-4 h-4" />אפס מטלות יומיות
            </button>
            {activityLog.length > 0 && (
              <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm"><TrendingUp className="text-indigo-400 w-4 h-4" />פעילות אחרונה</h3>
                <div className="space-y-2 max-h-40 sm:max-h-56 overflow-y-auto">
                  {activityLog.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0">
                      <span className="text-base mt-0.5 shrink-0">{e.type === 'approved' ? '✅' : e.type === 'rejected' ? '❌' : '⭐'}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-700 truncate">{e.kidName} — {e.choreTitle || 'בונוס'}{e.reward && <span className="text-emerald-600"> +{e.reward}🪙</span>}</p>
                        {e.note && <p className="text-gray-500 italic truncate">"{e.note}"</p>}
                        <p className="text-gray-400">{formatRelative(e.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {pendingChores.length > 0 && (
              <section className="bg-orange-50 p-4 sm:p-6 rounded-2xl border border-orange-200">
                <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />ממתינים לאישור ({pendingChores.length})
                </h3>
                <div className="space-y-3">
                  {pendingChores.map((chore) => {
                    const kid = familyConfig.kids?.find((k) => k.id === chore.completedBy);
                    return (
                      <div key={chore.id} className="bg-white p-3 sm:p-4 rounded-xl border border-orange-100 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between hover:shadow-sm transition-shadow">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl shrink-0">{kid?.avatar || '🧒'}</span>
                            <div className="min-w-0">
                              <h4 className="font-bold truncate">{chore.title}</h4>
                              <p className="text-sm text-gray-500">{kid?.name} | {chore.reward} <Coins className="inline w-3 h-3" /></p>
                            </div>
                          </div>
                          {chore.completedAt && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />הושלם: {formatRelative(chore.completedAt)}
                            </p>
                          )}
                          {chore.proofImage && (
                            <img src={chore.proofImage} alt="הוכחה" className="h-16 sm:h-20 mt-2 rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(chore.proofImage)} />
                          )}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto shrink-0">
                          <button onClick={() => handleApproveChore(chore)} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white p-2 px-3 rounded-lg flex justify-center items-center gap-1 transition-all active:scale-95 text-sm">
                            <Check className="w-4 h-4" />אישור
                          </button>
                          <button onClick={() => setRejectTarget(chore)} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 p-2 px-3 rounded-lg flex justify-center items-center gap-1 transition-all active:scale-95 text-sm">
                            <X className="w-4 h-4" />דחייה
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Open chores */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="text-indigo-500 w-5 h-5" />מטלות פתוחות ({openChores.length})</h3>
              <div className="space-y-2">
                {openChores.map((chore) => (
                  <div key={chore.id} className="p-3 border rounded-xl flex items-center justify-between bg-gray-50 group hover:bg-gray-100 transition-all gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm truncate block">
                        {chore.title} {chore.isRecurring && <RefreshCw className="w-3 h-3 inline text-indigo-400" />}
                      </span>
                      <p className="text-xs text-gray-500 truncate">
                        {chore.assignedTo === 'all' ? 'כולם' : familyConfig.kids?.find((k) => k.id === chore.assignedTo)?.name} | {chore.reward}🪙
                      </p>
                      {chore.createdAt && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatRelative(chore.createdAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">פתוח</span>
                      <button onClick={() => setEditingChore({ ...chore, reward: String(chore.reward) })}
                        className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-indigo-50 rounded">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteChore(chore.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {openChores.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">אין מטלות פתוחות</p>}
              </div>
            </section>

            {/* Completed chores (collapsible) */}
            {completedChores.length > 0 && (
              <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border">
                <button onClick={() => setShowCompleted((v) => !v)} className="w-full flex items-center justify-between font-bold">
                  <span className="flex items-center gap-2">
                    <Check className="text-emerald-500 w-5 h-5" />מטלות שהושלמו ({completedChores.length})
                  </span>
                  {showCompleted ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {showCompleted && (
                  <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                    {completedChores.map((chore) => {
                      const kid = familyConfig.kids?.find((k) => k.id === chore.completedBy);
                      return (
                        <div key={chore.id} className="p-3 border rounded-xl bg-green-50/50 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm truncate block line-through text-gray-400">
                              {chore.title} {chore.isRecurring && <RefreshCw className="w-3 h-3 inline text-indigo-400" />}
                            </span>
                            <p className="text-xs text-gray-500 truncate">
                              {kid?.avatar} {kid?.name} | +{chore.reward}🪙
                            </p>
                            <div className="flex gap-3 mt-0.5">
                              {chore.completedAt && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  הושלם: {formatRelative(chore.completedAt)}
                                </p>
                              )}
                              {chore.approvedAt && (
                                <p className="text-xs text-emerald-500 flex items-center gap-1">
                                  אושר: {formatRelative(chore.approvedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap shrink-0">הושלם</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
