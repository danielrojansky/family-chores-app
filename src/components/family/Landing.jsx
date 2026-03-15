import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Users } from 'lucide-react';
import { APP_VERSION } from '../../constants';
import { loadSession } from '../../lib/session';
import { useAuth } from '../../context/AuthContext';
import LoginPage from '../auth/LoginPage';

export default function Landing() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [checked, setChecked] = useState(false);

  // ── If a family session exists, redirect straight to that family ──────────
  useEffect(() => {
    if (authLoading) return;
    const session = loadSession();
    if (session?.familyId && isAuthenticated) {
      navigate(`/family/${session.familyId}`, { replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate, authLoading, isAuthenticated]);

  // ── Still loading ─────────────────────────────────────────────────────────
  if (authLoading || !checked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  // ── Not logged in → show login page ───────────────────────────────────────
  if (!isAuthenticated) return <LoginPage />;

  // ── Logged in → show families list ────────────────────────────────────────
  const families = user?.families || [];

  return (
    <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        {/* User info */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg">
              {user?.name?.charAt(0) || '👤'}
            </div>
          )}
          <div className="text-right">
            <p className="font-bold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>

        <button onClick={logout}
          className="text-xs text-red-400 hover:text-red-600 mb-6 flex items-center gap-1 mx-auto transition-colors">
          <LogOut className="w-3 h-3" />התנתק
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-1">המשפחות שלי</h2>
        <p className="text-sm text-gray-400 mb-5">בחר משפחה להמשך</p>

        {families.length > 0 ? (
          <div className="space-y-3 mb-6">
            {families.map((f) => (
              <button key={f.familyId}
                onClick={() => navigate(`/family/${f.familyId}`)}
                className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 flex items-center gap-3 transition-colors">
                <Users className="w-6 h-6 text-indigo-500 shrink-0" />
                <div className="text-right min-w-0">
                  <p className="font-bold text-indigo-800 truncate">{f.name || 'משפחה'}</p>
                  <p className="text-xs text-indigo-400">{f.role === 'parent' ? 'הורה' : f.role === 'kid' ? 'ילד/ה' : 'חבר/ה'}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-xl border mb-6">
            <p className="text-gray-500 mb-2">אין לך משפחות עדיין</p>
            <p className="text-sm text-gray-400">
              בקש/י מהמנהל לשלוח לך הזמנה, או לשייך אותך למשפחה.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <p className="text-xs text-gray-300">גרסה {APP_VERSION}</p>
          <span className="text-gray-200">|</span>
          <Link to="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">ניהול</Link>
        </div>
      </div>
    </div>
  );
}
