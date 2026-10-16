'use client';

import { useEffect, useState } from 'react';
import type { Score } from '@/lib/score';

export function scoreColor(total: number) {
  if (total >= 90) return '#facc15';
  if (total >= 75) return '#ff3d7f';
  if (total >= 60) return '#ff7aa8';
  if (total >= 40) return '#c9b3c2';
  return '#8f7589';
}

export function ScoreBadge({ score, size = 'sm' }: { score: Score; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 48 : 38;
  const r = s / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: s, height: s }} title={`${score.grade} · ${score.total}/100`}>
      <svg width={s} height={s} className="-rotate-90">
        <circle cx={s / 2} cy={s / 2} r={r} stroke="var(--color-line)" strokeWidth={3} fill="none" />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          stroke={scoreColor(score.total)}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(score.total / 100) * c} ${c}`}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${size === 'md' ? 'text-base' : 'text-xs'}`}>
        {score.total}
      </span>
    </div>
  );
}

/** Full-screen, animated reveal of a session's score. */
export function ScoreReveal({ score, onClose }: { score: Score; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setShown(Math.round(score.total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score.total]);

  const R = 92;
  const C = 2 * Math.PI * R;
  return (
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col items-center justify-center bg-bg/95 px-6 backdrop-blur-2xl" onClick={onClose}>
      <p className="text-sm font-semibold tracking-[0.3em] text-ink-3 uppercase">mySex Score</p>
      <div className="relative my-6 h-56 w-56">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff3d7f" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={R} stroke="var(--color-surface-2)" strokeWidth="14" fill="none" />
          <circle
            cx="110"
            cy="110"
            r={R}
            stroke="url(#scoreGrad)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * C} ${C}`}
            style={{ filter: 'drop-shadow(0 0 12px rgba(255,61,127,0.6))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-extralight tabular-nums">{shown}</span>
          <span className="text-sm text-ink-3">/ 100</span>
        </div>
      </div>
      <p className="font-display text-3xl font-bold">
        {score.emoji} {score.grade}
      </p>
      <div className="mt-6 w-full max-w-xs space-y-2.5">
        {score.parts.map((p) => (
          <div key={p.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-2">{p.label}</span>
              <span className="tabular-nums text-ink-3">
                {p.points}/{p.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-gradient-to-r from-rose to-ovulation transition-all duration-1000" style={{ width: `${(p.points / p.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-xs text-ink-3">Tap anywhere to close</p>
    </div>
  );
}
