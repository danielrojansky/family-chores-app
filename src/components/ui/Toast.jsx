import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let toastId = 0;

// ─── Provider ────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 5000),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        dir="rtl"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 'calc(100vw - 2rem)' }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Individual toast ─────────────────────────────────────────────────────────
const STYLES = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
    text: 'text-emerald-800',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-indigo-50 border-indigo-200',
    icon: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
    text: 'text-indigo-800',
  },
};

function ToastItem({ toast, onDismiss }) {
  const s = STYLES[toast.type] || STYLES.info;
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        ${s.bg} ${toast.leaving ? 'animate-fade-out' : 'animate-slide-in'}
        transition-all duration-300 max-w-sm w-full`}
    >
      {s.icon}
      <p className={`text-sm font-medium flex-1 ${s.text}`}>{toast.message}</p>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
