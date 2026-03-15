import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import PinEntry from '../ui/PinEntry';
import FamilySetup from './FamilySetup';
import ProfilePicker from './ProfilePicker';
import ParentDashboard from './ParentDashboard';
import ChildDashboard from './ChildDashboard';
import { logAction } from '../../lib/logger';

export default function FamilyApp() {
  const {
    familyId, familyConfig, configLoading,
    selectedProfile, setSelectedProfile,
    currentProfile, loginAs,
    apiCall, mutateConfig,
  } = useFamily();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (configLoading || !familyConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
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

  // ── PIN entry ─────────────────────────────────────────────────────────────
  if (selectedProfile && !currentProfile) {
    const correctPin = selectedProfile.type === 'parent'
      ? familyConfig.parentPin
      : familyConfig.kids?.find((k) => k.id === selectedProfile.id)?.pin;
    return (
      <PinEntry
        profile={selectedProfile}
        correctPin={correctPin}
        onSuccess={() => loginAs(selectedProfile)}
        onBack={() => setSelectedProfile(null)}
      />
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (currentProfile.type === 'parent') return <ParentDashboard />;
  return <ChildDashboard />;
}
