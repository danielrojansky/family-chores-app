import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../context/FamilyContext';
import PinEntry from '../ui/PinEntry';
import FamilySetup from './FamilySetup';
import ProfilePicker from './ProfilePicker';
import ParentDashboard from './ParentDashboard';
import ChildDashboard from './ChildDashboard';
import { logAction } from '../../lib/logger';
import { clearSession } from '../../lib/session';

export default function FamilyApp() {
  const navigate = useNavigate();
  const {
    familyId, familyConfig, configLoading, configError,
    selectedProfile, setSelectedProfile,
    currentProfile, loginAs,
    apiCall, mutateConfig,
  } = useFamily();

  // ── Auth error (401/403) ────────────────────────────────────────────────
  if (configError?.name === 'AuthError') {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg border p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">נדרשת התחברות</h2>
          <p className="text-sm text-slate-500 mb-6">
            כדי לגשת למשפחה זו, יש להתחבר עם חשבון מורשה.
          </p>
          <button onClick={() => { clearSession(); navigate('/'); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
            למסך ההתחברות
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (configLoading || !familyConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-slate-400">טוען...</p>
      </div>
    </div>
  );

  // ── Setup (first-time) ────────────────────────────────────────────────────
  if (!familyConfig.isSetup) {
    const handleSetup = async (config) => {
      await apiCall('setConfig', { config });
      await mutateConfig();
      logAction(familyId, 'setup.complete', { parents: config.parents?.length, kids: config.kids?.length });
    };
    return <FamilySetup onSetup={handleSetup} />;
  }

  // ── Profile picker ────────────────────────────────────────────────────────
  if (!selectedProfile) return <ProfilePicker />;

  // ── PIN entry — server validates; PinEntry is self-contained ─────────────
  if (selectedProfile && !currentProfile) {
    return (
      <PinEntry
        profile={selectedProfile}
        onSuccess={() => loginAs(selectedProfile)}
        onBack={() => setSelectedProfile(null)}
      />
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (currentProfile.type === 'parent') return <ParentDashboard />;
  return <ChildDashboard />;
}
