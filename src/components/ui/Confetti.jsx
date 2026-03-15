import React from 'react';

export default function Confetti() {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`, top: '-12px',
            backgroundColor: colors[i % colors.length],
            animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}
