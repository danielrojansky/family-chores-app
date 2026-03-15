import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../constants';

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, register, googleClientId } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // ── Initialize Google Sign-In ─────────────────────────────────────────────
  useEffect(() => {
    if (!googleClientId || !window.google?.accounts) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        setError(''); setLoading(true);
        try {
          await loginWithGoogle(response.credential);
        } catch (err) {
          setError(err.message || 'שגיאה בהתחברות עם Google');
        } finally { setLoading(false); }
      },
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
        locale: 'he',
      });
    }
  }, [googleClientId, loginWithGoogle]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message || 'שגיאה');
    } finally { setLoading(false); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🏠</div>
        <h1 className="text-2xl font-bold text-indigo-900 mb-1">מטלות משפחתיות</h1>
        <p className="text-sm text-gray-400 mb-6">
          {mode === 'register' ? 'יצירת חשבון חדש' : 'התחבר כדי להמשיך'}
        </p>

        {/* Google Sign-In button */}
        {googleClientId && (
          <>
            <div ref={googleBtnRef} className="flex justify-center mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t" />
              <span className="text-xs text-gray-400">או</span>
              <div className="flex-1 border-t" />
            </div>
          </>
        )}

        {/* Email / Password form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 text-right">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-3 pr-10 border rounded-xl text-sm" placeholder="שם מלא" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 pr-10 border rounded-xl text-sm" placeholder="אימייל" dir="ltr" />
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} required value={password}
              onChange={(e) => setPassword(e.target.value)} minLength={4}
              className="w-full p-3 pr-10 pl-10 border rounded-xl text-sm" placeholder="סיסמה" dir="ltr" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-3 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold p-3 rounded-xl transition-colors">
            {loading ? 'מתחבר...' : mode === 'register' ? 'צור חשבון' : 'התחבר'}
          </button>
        </form>

        <div className="mt-4">
          {mode === 'login' ? (
            <p className="text-sm text-gray-500">
              אין לך חשבון?{' '}
              <button onClick={() => { setMode('register'); setError(''); }}
                className="text-indigo-600 font-bold hover:underline">הרשם</button>
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              יש לך חשבון?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}
                className="text-indigo-600 font-bold hover:underline">התחבר</button>
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <p className="text-xs text-gray-300">גרסה {APP_VERSION}</p>
          <span className="text-gray-200">|</span>
          <Link to="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">ניהול</Link>
        </div>
      </div>
    </div>
  );
}
