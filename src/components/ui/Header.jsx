import React from 'react';
import { ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

export default function Header() {
  const { currentProfile, activeTab, setActiveTab, logout } = useFamily();
  if (!currentProfile) return null;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0 ${
            currentProfile.type === 'parent' ? 'bg-indigo-100' : 'bg-emerald-100'
          }`}>
            {currentProfile.type === 'parent'
              ? <ShieldCheck className="w-5 h-5 text-indigo-600" />
              : (currentProfile.avatar || '🧒')}
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight text-sm sm:text-base truncate">שלום, {currentProfile.name}</p>
            <p className="text-xs text-gray-400">{currentProfile.type === 'parent' ? 'הורה' : 'ילד/ה'}</p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          {currentProfile.type === 'parent' && (
            <button onClick={() => setActiveTab((t) => (t === 'settings' ? 'dashboard' : 'settings'))}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          )}
          <button onClick={logout} className="p-2 text-red-400 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline text-sm">החלף</span>
          </button>
        </div>
      </div>
    </header>
  );
}
