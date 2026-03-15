import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Users, Link2, ScrollText, Settings, Lock,
  Trash2, Eye, EyeOff, Copy, X, RefreshCw, Image,
  ArrowRight,
} from 'lucide-react';
import { adminCall } from '../../lib/api';
import { ADMIN_SESSION_KEY, APP_VERSION } from '../../constants';

// ─── Admin Login ────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await adminCall('login', { password });
      localStorage.setItem(ADMIN_SESSION_KEY, res.token);
      onLogin(res.token);
    } catch (err) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally { setLoading(false); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 sm:p-8 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">פאנל ניהול</h1>
        <p className="text-sm text-gray-400 mb-6">הכנס סיסמת מנהל</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-xl text-center" placeholder="סיסמה" autoFocus required />
          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold p-3 rounded-xl transition-colors">
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 mt-4 inline-block transition-colors">
          חזרה לאפליקציה
        </Link>
      </div>
    </div>
  );
}

// ─── Family Management Tab ──────────────────────────────────────────────────
function FamilyManagement({ token }) {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFamily, setExpandedFamily] = useState(null);
  const [familyDetail, setFamilyDetail] = useState(null);
  const [resetPinData, setResetPinData] = useState(null);
  const [newPin, setNewPin] = useState('');

  const loadFamilies = useCallback(async () => {
    try {
      const res = await adminCall('listFamilies', {}, token);
      setFamilies(res.families || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);

  const viewFamily = async (familyId) => {
    if (expandedFamily === familyId) { setExpandedFamily(null); setFamilyDetail(null); return; }
    try {
      const res = await adminCall('getFamily', { familyId }, token);
      setFamilyDetail(res);
      setExpandedFamily(familyId);
    } catch {}
  };

  const deleteFamily = async (familyId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משפחה זו? פעולה זו בלתי הפיכה.')) return;
    await adminCall('deleteFamily', { familyId }, token);
    await loadFamilies();
    if (expandedFamily === familyId) { setExpandedFamily(null); setFamilyDetail(null); }
  };

  const resetPin = async () => {
    if (!resetPinData || newPin.length !== 4) return;
    await adminCall('resetPin', { ...resetPinData, newPin }, token);
    setResetPinData(null); setNewPin('');
    if (expandedFamily) viewFamily(expandedFamily);
  };

  const deleteMedia = async (familyId, choreId) => {
    await adminCall('deleteMedia', { familyId, choreId }, token);
    if (expandedFamily) viewFamily(expandedFamily);
  };

  if (loading) return <p className="text-center text-gray-400 py-8">טוען...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" />משפחות ({families.length})</h2>
        <button onClick={loadFamilies} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {families.length === 0 && <p className="text-gray-400 text-center py-6">אין משפחות רשומות עדיין</p>}

      {families.map((f) => (
        <div key={f.id} className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => viewFamily(f.id)}>
            <div>
              <p className="font-bold">{f.name || 'משפחה ללא שם'}</p>
              <p className="text-xs text-gray-400">ID: {f.id}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); deleteFamily(f.id); }}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {expandedFamily === f.id && familyDetail && (
            <div className="p-4 border-t space-y-4">
              {/* Parents */}
              <div>
                <h4 className="font-bold text-sm text-gray-600 mb-2">הורים</h4>
                {familyDetail.config?.parents?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <span className="text-sm">{p.name}</span>
                    <button onClick={() => setResetPinData({ familyId: f.id, targetType: 'parent', targetId: p.id })}
                      className="text-xs text-indigo-600 hover:underline">אפס קוד</button>
                  </div>
                ))}
              </div>
              {/* Kids */}
              <div>
                <h4 className="font-bold text-sm text-gray-600 mb-2">ילדים</h4>
                {familyDetail.config?.kids?.map((k) => (
                  <div key={k.id} className="flex items-center justify-between py-1">
                    <span className="text-sm">{k.avatar} {k.name} — {k.balance || 0} מטבעות</span>
                    <button onClick={() => setResetPinData({ familyId: f.id, targetType: 'kid', targetId: k.id })}
                      className="text-xs text-indigo-600 hover:underline">אפס קוד</button>
                  </div>
                ))}
              </div>
              {/* Chores with media */}
              {familyDetail.chores?.filter((c) => c.proofImage).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-gray-600 mb-2">מדיה (הוכחות)</h4>
                  {familyDetail.chores.filter((c) => c.proofImage).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-gray-600 truncate flex-1">{c.title}</span>
                      <button onClick={() => deleteMedia(f.id, c.id)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><Image className="w-3 h-3" />מחק תמונה</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Reset PIN modal */}
      {resetPinData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Lock className="w-5 h-5" />איפוס קוד</h3>
            <input type="password" inputMode="numeric" maxLength={4} value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full p-3 border rounded-xl text-center text-2xl tracking-[0.5em] mb-4" placeholder="קוד חדש" autoFocus />
            <div className="flex gap-2">
              <button onClick={resetPin} disabled={newPin.length !== 4}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold p-3 rounded-xl">שמור</button>
              <button onClick={() => { setResetPinData(null); setNewPin(''); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invite Management Tab ──────────────────────────────────────────────────
function InviteManagement({ token }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  const loadInvites = useCallback(async () => {
    try {
      const res = await adminCall('listInvites', {}, token);
      setInvites(res.invites || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  const createInvite = async () => {
    if (!newFamilyName.trim()) return;
    await adminCall('createInvite', { familyName: newFamilyName.trim() }, token);
    setNewFamilyName('');
    await loadInvites();
  };

  const revokeInvite = async (code) => {
    await adminCall('revokeInvite', { code }, token);
    await loadInvites();
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  if (loading) return <p className="text-center text-gray-400 py-8">טוען...</p>;

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-500" />הזמנות</h2>

      <div className="flex gap-2">
        <input type="text" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createInvite()}
          className="flex-1 p-3 border rounded-xl min-w-0" placeholder="שם משפחה חדשה" />
        <button onClick={createInvite} disabled={!newFamilyName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold px-4 rounded-xl transition-colors shrink-0">
          צור הזמנה
        </button>
      </div>

      {invites.length === 0 && <p className="text-gray-400 text-center py-6">אין הזמנות</p>}

      {invites.map((inv) => (
        <div key={inv.code} className={`border rounded-xl p-4 ${inv.used ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">{inv.familyName}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              inv.used ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>{inv.used ? 'נוצלה' : 'פעילה'}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2 font-mono">{inv.code}</p>
          {!inv.used && (
            <div className="flex gap-2">
              <button onClick={() => copyLink(inv.code)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                <Copy className="w-3 h-3" />{copiedCode === inv.code ? 'הועתק!' : 'העתק קישור'}
              </button>
              <button onClick={() => revokeInvite(inv.code)}
                className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                <X className="w-3 h-3" />בטל
              </button>
            </div>
          )}
          {inv.used && inv.familyId && (
            <p className="text-xs text-gray-400">Family ID: {inv.familyId}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Log Viewer Tab ─────────────────────────────────────────────────────────
function LogViewer({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminCall('getLogs', { familyId: familyFilter || undefined, limit: 100 }, token);
      setLogs(res.logs || []);
    } catch {} finally { setLoading(false); }
  }, [token, familyFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const levelColor = { info: 'text-blue-600', warn: 'text-yellow-600', error: 'text-red-600' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2"><ScrollText className="w-5 h-5 text-indigo-500" />לוגים</h2>
        <button onClick={loadLogs} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>
      <input type="text" value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}
        className="w-full p-2 border rounded-xl text-sm" placeholder="סנן לפי Family ID (ריק = הכל)" />

      {loading && <p className="text-center text-gray-400 py-4">טוען...</p>}

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-xs border-b py-2 flex gap-2">
            <span className={`font-mono font-bold shrink-0 ${levelColor[log.level] || 'text-gray-600'}`}>{log.level?.toUpperCase()}</span>
            <span className="text-gray-400 shrink-0 font-mono">{new Date(log.ts).toLocaleString('he-IL')}</span>
            <span className="font-bold text-gray-700">{log.action}</span>
            {log.actor && <span className="text-gray-500">{log.actor.name}</span>}
            {log.familyId && <span className="text-gray-300 font-mono">[{log.familyId}]</span>}
          </div>
        ))}
        {!loading && logs.length === 0 && <p className="text-gray-400 text-center py-6">אין לוגים</p>}
      </div>
    </div>
  );
}

// ─── Admin Config Tab ───────────────────────────────────────────────────────
function AdminConfig({ token }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');

  const changePassword = async () => {
    if (!newPw || newPw.length < 4) { setMsg('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    try {
      await adminCall('changePassword', { currentPassword: currentPw, newPassword: newPw }, token);
      setMsg('סיסמה שונתה בהצלחה!');
      setCurrentPw(''); setNewPw('');
    } catch (err) { setMsg(err.message); }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" />הגדרות מערכת</h2>

      <div className="bg-white p-4 rounded-xl border space-y-3">
        <h3 className="font-bold text-sm">שינוי סיסמת מנהל</h3>
        <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full p-2 border rounded-xl text-sm" placeholder="סיסמה נוכחית" />
        <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="w-full p-2 border rounded-xl text-sm" placeholder="סיסמה חדשה" />
        {msg && <p className="text-sm font-bold text-indigo-600">{msg}</p>}
        <button onClick={changePassword}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">שנה סיסמה</button>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border">
        <p className="text-xs text-gray-400">גרסה {APP_VERSION}</p>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ───────────────────────────────────────────────────
export default function AdminDashboard() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(ADMIN_SESSION_KEY) || ''; } catch { return ''; }
  });
  const [loggedIn, setLoggedIn] = useState(!!token);
  const [tab, setTab] = useState('families');

  const handleLogin = (t) => { setToken(t); setLoggedIn(true); };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(''); setLoggedIn(false);
  };

  if (!loggedIn) return <AdminLogin onLogin={handleLogin} />;

  const tabs = [
    { id: 'families', label: 'משפחות', icon: Users },
    { id: 'invites', label: 'הזמנות', icon: Link2 },
    { id: 'logs', label: 'לוגים', icon: ScrollText },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h1 className="font-bold">פאנל ניהול</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              <ArrowRight className="w-3 h-3" />חזרה
            </Link>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition-colors">התנתק</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-4">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                tab === id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border mb-8">
          {tab === 'families' && <FamilyManagement token={token} />}
          {tab === 'invites' && <InviteManagement token={token} />}
          {tab === 'logs' && <LogViewer token={token} />}
          {tab === 'settings' && <AdminConfig token={token} />}
        </div>
      </div>
    </div>
  );
}
