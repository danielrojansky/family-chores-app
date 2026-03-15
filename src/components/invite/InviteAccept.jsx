import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
