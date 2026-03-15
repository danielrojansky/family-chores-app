import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, CheckCircle } from 'lucide-react';
import { inviteCall } from '../../lib/api';
import { logAction } from '../../lib/logger';
import FamilySetup from '../family/FamilySetup';

export default function InviteAccept() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;
    inviteCall('getInvite', { code })
      .then((res) => { setInvite(res); setLoading(false); })
      .catch((err) => { setError(err.message || 'הזמנה לא תקפה'); setLoading(false); });
  }, [code]);

  // ── Accept a "join" invite (existing family) ──────────────────────────────
  const handleJoin = async () => {
    setSubmitting(true);
    try {
      const res = await inviteCall('accept', { code });
      logAction(res.familyId, 'invite.joined', { inviteCode: code });
      navigate(`/family/${res.familyId}`);
    } catch (err) {
      alert(err.message || 'שגיאה בהצטרפות למשפחה');
    } finally { setSubmitting(false); }
  };

  // ── Accept a "create" invite (new family setup) ───────────────────────────
  const handleSetup = async (config) => {
    setSubmitting(true);
    try {
      const res = await inviteCall('accept', { code, config });
      logAction(res.familyId, 'setup.complete', { inviteCode: code });
      navigate(`/family/${res.familyId}`);
    } catch (err) {
      alert(err.message || 'שגיאה ביצירת המשפחה');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  if (error || !invite || invite.used) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          {invite?.used ? 'הזמנה כבר נוצלה' : 'הזמנה לא תקפה'}
        </h1>
        <p className="text-sm text-gray-500 mb-4">{error || 'הקישור שהגעת אליו אינו פעיל'}</p>
        <Link to="/" className="text-indigo-600 hover:underline text-sm font-bold">לדף הבית</Link>
      </div>
    </div>
  );

  // ── "Join" invite — simple confirmation page ──────────────────────────────
  if (invite.type === 'join' && invite.familyId) {
    return (
      <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        {submitting && (
          <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        )}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-indigo-900 mb-2">הצטרפות למשפחה</h1>
          <p className="text-gray-600 mb-1">הוזמנת להצטרף ל:</p>
          <p className="text-xl font-bold text-indigo-700 mb-6">{invite.familyName}</p>
          <button onClick={handleJoin} disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-lg mb-3">
            <CheckCircle className="inline w-5 h-5 ml-2" />הצטרף עכשיו
          </button>
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">ביטול</Link>
        </div>
      </div>
    );
  }

  // ── "Create" invite — full family setup form ──────────────────────────────
  return (
    <div className="relative">
      {submitting && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      )}
      <div dir="rtl" className="text-center py-4 bg-indigo-600 text-white">
        <p className="text-sm">הוזמנת להצטרף! שם משפחה: <strong>{invite.familyName}</strong></p>
      </div>
      <FamilySetup onSetup={handleSetup} />
    </div>
  );
}
