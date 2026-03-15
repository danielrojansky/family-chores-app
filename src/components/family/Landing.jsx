import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../../constants';
import { loadSession } from '../../lib/session';

/**
 * Landing page — if a session exists, redirect to the family.
 * Otherwise show a simple landing.
 */
export default function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session?.familyId) {
      navigate(`/family/${session.familyId}`, { replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-3xl font-bold text-indigo-900 mb-2">מטלות משפחתיות</h1>
        <p className="text-gray-500 mb-8">ניהול מטלות, מטבעות ותגמולים למשפחה</p>
        <p className="text-sm text-gray-400 mb-6">
          אם קיבלת הזמנה, לחצ/י על הקישור כדי להצטרף.
        </p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs text-gray-300">גרסה {APP_VERSION}</p>
          <span className="text-gray-200">|</span>
          <Link to="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">ניהול</Link>
        </div>
      </div>
    </div>
  );
}
