import React from 'react';

export default function Confetti() {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }, (_, i) => {
        const size = 6 + Math.random() * 8;
        const delay = Math.random() * 1.2;
        const duration = 2 + Math.random() * 2.5;
        const left = Math.random() * 100;
        const isCircle = i % 3 === 1;
        const rotation = Math.random() * 360;
        const wobble = -40 + Math.random() * 80;

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              top: '-20px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: colors[i % colors.length],
              borderRadius: isCircle ? '50%' : '2px',
              animation: `confettiFall${i % 3} ${duration}s ease-in forwards`,
              animationDelay: `${delay}s`,
              transform: `rotate(${rotation}deg)`,
              opacity: 0,
              ['--wobble']: `${wobble}px`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall0 {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(30px) rotate(720deg); opacity: 0; }
        }
        @keyframes confettiFall1 {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(50vh) translateX(-25px) rotate(360deg); opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(15px) rotate(900deg); opacity: 0; }
        }
        @keyframes confettiFall2 {
          0% { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) translateX(-30px) rotate(-540deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
