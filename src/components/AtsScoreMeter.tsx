import { useEffect, useState } from 'react';

interface AtsScoreMeterProps {
  score: number;
}

export function AtsScoreMeter({ score }: AtsScoreMeterProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-400', label: 'Strong Match', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.35)]', glowBg: 'bg-emerald-500/15' };
    if (s >= 60) return { stroke: '#f59e0b', text: 'text-amber-400', label: 'Moderate Match', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.30)]', glowBg: 'bg-amber-500/15' };
    return { stroke: '#f43f5e', text: 'text-rose-400', label: 'Weak Match', glow: 'shadow-[0_0_40px_rgba(244,63,94,0.30)]', glowBg: 'bg-rose-500/15' };
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative h-36 w-36 rounded-full transition-shadow duration-700 ${color.glow}`}>
        {/* Radial glow behind */}
        <div className={`pointer-events-none absolute inset-0 rounded-full ${color.glowBg} blur-2xl transition-all duration-700`} />
        <svg className="relative h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-slate-800"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke 0.3s ease, stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold tabular-nums transition-colors duration-500 ${color.text}`}>
            {displayScore}
          </span>
          <span className="text-xs font-medium text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full transition-colors duration-500"
          style={{ backgroundColor: color.stroke }}
        />
        <span className="text-sm font-medium text-slate-300">{color.label}</span>
      </div>
    </div>
  );
}
