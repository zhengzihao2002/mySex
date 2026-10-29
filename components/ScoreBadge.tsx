'use client';
import { useT } from './I18nProvider';

import { useEffect, useState } from 'react';
import {scoreVersionLabel,type Score} from '@/lib/score';
import type { Break } from '@/lib/types';
import { SessionTimes } from './SessionTimes';

export function scoreColor(total: number) {
  const value = Number.isFinite(total) ? Math.max(0, Math.min(100, total)) : 0;
  return `hsl(${(value * 1.2).toFixed(2)} 80% 60%)`;
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
export type RevealTimes = { startedAt: string; activeSec: number; breakSec: number; breaks: Break[] };

export type RewardReveal={xp:number;level:number;title:string;levelUp:boolean;missions:number};

export function ScoreReveal({ score, times, reward, onClose }: { score: Score; times?: RevealTimes; reward?:RewardReveal; onClose: () => void }) {
  const { t } = useT();
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
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col items-center overflow-y-auto bg-bg/95 px-6 py-8 backdrop-blur-2xl" onClick={onClose}>
      <button type="button" className="btn-ghost mb-3 shrink-0" onClick={onClose}>{t('Close')}</button>
      <p className="text-sm font-semibold tracking-[0.3em] text-ink-3 uppercase">{t('mySex Score')}</p>
      <div className="relative my-4 h-48 w-48 shrink-0">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r={R} stroke="var(--color-surface-2)" strokeWidth="14" fill="none" />
          <circle
            cx="110"
            cy="110"
            r={R}
            stroke={scoreColor(shown)}
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * C} ${C}`}
            style={{ filter: `drop-shadow(0 0 12px ${scoreColor(shown)})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-extralight tabular-nums">{shown}</span>
          <span className="text-sm text-ink-3">/ 100</span>
        </div>
      </div>
      <p className="font-display text-3xl font-bold">
        {score.emoji} {t(score.grade)}
      </p>
      <p className="mt-1 text-xs text-ink-3">{t(scoreVersionLabel(score.version))}</p>
      {reward&&<div className="mt-3 w-full max-w-xs rounded-2xl border border-amber-300/40 bg-amber-300/5 p-3 text-center">
        <p className="text-xl font-bold text-amber-300">+{reward.xp} XP</p>
        <p className="font-semibold">{reward.levelUp?'✦ ':''}{t(reward.title)}</p>
        <p className="text-xs text-ink-2">{reward.levelUp?t('Level up!'):t('Level {n}',{n:reward.level})}{reward.missions>0?` · ${t('{n} missions completed',{n:reward.missions})}`:''}</p>
      </div>}
      {times && (
        <div className="mt-5 w-full max-w-xs">
          <SessionTimes {...times} />
        </div>
      )}
      <div className="mt-5 w-full max-w-xs space-y-2.5">
        {score.parts.map((p) => (
          <div key={p.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-2">{t(p.label)}</span>
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
      <p className="mt-8 text-xs text-ink-3">{t('Tap anywhere to close')}</p>
    </div>
  );
}
