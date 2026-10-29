'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useT} from './I18nProvider';
import {progression,type MissionRun} from '@/lib/progression';
import type {SexSession} from '@/lib/types';
export function CoupleProgress({sessions,runs=[],onExplore}:{sessions:SexSession[];runs?:MissionRun[];onExplore?:()=>void}) {
  const {t}=useT();const game=useMemo(()=>progression(sessions,runs),[sessions,runs]);
  const active=game.quests.find(q=>!q.complete);
  const className='card relative block w-full overflow-hidden border-rose/30 bg-gradient-to-br from-plum/30 via-surface to-surface text-left';
  const content=<>
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold tracking-widest text-rose-2">✦ {t('Couple quests')}</span><span className="text-xs text-ink-2">{t('Level {n}',{n:game.rank.level})} · {game.xp.toLocaleString()} XP</span></div>
    <h2 className="mt-2 font-display text-xl font-bold">{t(game.rank.title)}</h2>
    <div className="my-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-rose to-amber-300" style={{width:`${game.rank.progress*100}%`}}/></div>
    <p className="text-xs text-ink-2">{game.rank.ceiling?t('{n} XP to {title}',{n:Math.max(0,game.rank.ceiling-game.xp),title:t(game.rank.nextTitle!)}):t('Highest rank unlocked')}</p>
    <p className="mt-3 text-sm">{onExplore?t('View quest progress'):active?`${t(active.mission.title)} · ${Math.floor(active.value)}/${active.target}`:t('All quests completed')} <span aria-hidden>↓</span></p>
  </>;
  return onExplore?<button type="button" className={className} onClick={onExplore}>{content}</button>:<Link href="/missions" className={className}>{content}</Link>;
}
