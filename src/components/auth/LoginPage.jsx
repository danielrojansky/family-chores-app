import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Fingerprint, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../constants';
import { AUTH_SESSION_KEY } from '../../constants';
import { isWebAuthnSupported, loginWithPasskey } from '../../lib/webauthn';

// ─── Password strength indicator ─────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const levels = [
    { label: 'חלשה', color: 'bg-red-400', bars: 1 },
    { label: 'בינונית', color: 'bg-amber-400', bars: 2 },
    { label: 'טובה', color: 'bg-emerald-400', bars: 3 },
    { label: 'חזקה', color: 'bg-emerald-500', bars: 4 },
  ];
  const level = levels[Math.min(Math.floor(strength / 1.25), 3)];

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < level.bars ? level.color : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
        חוזק סיסמה: {level.label}
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, register, googleClientId } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);
  const googleBtnRef = useRef(null);

  // Check WebAuthn support
  useEffect(() => {
    setWebAuthnAvailable(isWebAuthnSupported());
  }, []);

  // Google Sign-In
  useEffect(() => {
    if (!googleClientId || !window.google?.accounts) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        setError(''); setLoading(true);
        try { await loginWithGoogle(response.credential); }
        catch (err) { setError(err.message || 'שגיאה בהתחברות עם Google'); }
        finally { setLoading(false); }
      },
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 300, text: 'signin_with', locale: 'he',
      });
    }
  }, [googleClientId, loginWithGoogle]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'register' && password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים'); return;
    }
    setError(''); setLoading(true);
    try {
      if (mode === 'register') await register(email, password, name);
      else await loginWithEmail(email, password);
    } catch (err) { setError(err.message || 'שגיאה'); }
    finally { setLoading(false); }
  };

  const handlePasskeyLogin = async () => {
    if (!email.trim()) { setError('נא להזין אימייל לפני כניסה עם מפתח'); return; }
    setError(''); setPasskeyLoading(true);
    try {
      const session = await loginWithPasskey(email);
      // Store token and trigger auth context refresh
      localStorage.setItem(AUTH_SESSION_KEY, session.token);
      window.location.reload(); // reload to trigger AuthContext session check
    } catch (err) { setError(err.message || 'שגיאה בכניסה עם מפתח'); }
    finally { setPasskeyLoading(false); }
  };

  const switchMode = (m) => { setMode(m); setError(''); setPassword(''); };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 text-center">
          <div className="text-4xl mb-2">🏠</div>
          <h1 className="text-xl font-bold text-white">מטלות משפחתיות</h1>
          <p className="text-indigo-200 text-sm mt-0.5">
            {mode === 'register' ? 'יצירת חשבון חדש' : 'ברוך שובך!'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Google Sign-In */}
          {googleClientId && (
            <>
              <div ref={googleBtnRef} className="flex justify-center" />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-slate-100" />
                <span className="text-xs text-slate-400 font-medium">או</span>
                <div className="flex-1 border-t border-slate-100" />
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="שם מלא" />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="אימייל" dir="ltr" />
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} minLength={8}
                  className="w-full p-3 pr-10 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder={mode === 'register' ? 'סיסמה (לפחות 8 תווים)' : 'סיסמה'} dir="ltr" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && <PasswordStrength password={password} />}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm font-medium text-center">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.99]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מתחבר...
                </span>
              ) : mode === 'register' ? 'צור חשבון' : 'התחבר'}
            </button>
          </form>

          {/* Passkey login */}
          {webAuthnAvailable && mode === 'login' && (
            <button onClick={handlePasskeyLogin} disabled={passkeyLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-all text-sm disabled:opacity-50">
              {passkeyLoading
                ? <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                : <Fingerprint className="w-4 h-4 text-indigo-500" />
              }
              {passkeyLoading ? 'מאמת...' : 'כניסה עם מפתח (Face ID / Touch ID)'}
            </button>
          )}

          {/* Mode switch */}
          <div className="text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-500">
                אין לך חשבון?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-600 font-semibold hover:underline">הרשם</button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                יש לך חשבון?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-600 font-semibold hover:underline">התחבר</button>
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-300">גרסה {APP_VERSION}</p>
            <span className="text-slate-200">|</span>
            <Link to="/admin" className="text-xs text-slate-300 hover:text-slate-500 transition-colors flex items-center gap-1">
              <KeyRound className="w-3 h-3" />ניהול
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
