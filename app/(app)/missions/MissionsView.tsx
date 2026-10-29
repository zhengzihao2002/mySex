'use client';
import {progressFillStyle} from '@/lib/progress-style';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useT} from '@/components/I18nProvider';
import {Sheet} from '@/components/Sheet';
import {CoupleProgress} from '@/components/CoupleProgress';
import {MISSIONS,RANKS,TOP_RANK_XP,rankThreshold,progression,type MissionRun} from '@/lib/progression';
import type {SexSession} from '@/lib/types';

export function MissionsView({sessions}:{sessions:SexSession[];runs?:MissionRun[];meId?:string;partnerName?:string}) {
  const {t,f}=useT(),router=useRouter();
  const [ranksOpen,setRanksOpen]=useState(false);
  const game=useMemo(()=>progression(sessions),[sessions]);
  // Keep two phones in sync without push notifications or background polling.
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')router.refresh();};const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[router]);
  const paths=[{key:'explorer',title:t('Explorer'),icon:'🧭'},{key:'endurance',title:t('Endurance'),icon:'🔥'},{key:'rhythm',title:t('Rhythm'),icon:'🌙'},{key:'finale',title:t('Chapter finale'),icon:'👑'}];
  return <div className="space-y-5 pt-2 pb-4">
    <header><Link href="/home" className="inline-flex min-h-11 items-center text-sm text-ink-3">← {t('Home')}</Link><h1 className="font-display text-3xl font-bold">{t('Couple quests')}</h1><p className="mt-1 text-sm text-ink-2">{t('Two players. One legendary story.')}</p></header>
    <CoupleProgress sessions={sessions} onExplore={()=>{const board=document.getElementById('quest-board');board?.focus({preventScroll:true});board?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}}/>
    <button className="btn-ghost w-full" onClick={()=>setRanksOpen(true)}>{t('Rank ladder & XP')}</button>
    <p className="text-xs text-ink-3">{t('Quests complete automatically from your saved intercourse records. No acceptance or skipping. Different UTC dates count as different days.')}</p>

    <div id="quest-board" tabIndex={-1} className="space-y-5 scroll-mt-4 outline-none">
    {paths.map(path=><section key={path.key} className="space-y-3">
      <h2 className="font-display text-xl font-bold">{path.icon} {path.title}</h2>
      {MISSIONS.filter(m=>m.path===path.key).map(m=>{
        const quest=game.quests.find(q=>q.mission.key===m.key)!;
        const complete=quest.complete;
        const status=complete?t('Completed'):t('In progress');
        return <article key={m.key} className={`rounded-3xl border p-4 ${complete?'border-amber-300/40 bg-amber-300/5':'border-line bg-surface'}`}>
          <div className="flex items-start justify-between gap-3"><div><p className={`text-xs ${complete?'text-amber-300':'text-rose-2'}`}>{complete?'🏆 ':''}{status}</p><h3 className="mt-1 font-semibold">{t(m.title)}</h3></div><span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">+{m.xp} XP</span></div>
          <p className="mt-2 text-sm text-ink-2">{t(m.description)}</p>
          {quest&&<div className="mt-3"><div className="mb-1 flex justify-between text-xs text-ink-2"><span>{t('Progress')}</span><b>{m.rule==='atlas'||m.rule==='combinations'?`${Math.round(quest.value*100)}%`:`${quest.value}/${quest.target}`}</b></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-rose to-amber-300 transition-all motion-reduce:transition-none" style={progressFillStyle(quest.value/quest.target)}/></div></div>}
          {quest.checks&&<div className="mt-2 space-y-1 text-xs text-ink-3">{quest.checks.map(c=><p key={c.label} className="flex justify-between gap-2"><span>{t(c.label)}</span><b className="tabular-nums">{c.value}/{c.target}</b></p>)}</div>}
          {complete&&!!quest.evidence.length&&<details className="mt-3 text-xs text-ink-2"><summary className="cursor-pointer py-2">{t('Saved record proof')} · {quest.evidence.length}</summary><div className="flex flex-wrap gap-2">{quest.evidence.map(id=>{const s=sessions.find(s=>s.id===id);return s?<Link className="chip" key={id} href={`/insights?session=${id}`}>{f.prettyDate(s.startedAt.slice(0,10))} · {f.formatDuration(s.durationSec??0)}</Link>:null;})}</div></details>}
          {!complete&&m.finale&&<p className="mt-2 text-xs text-ink-3">{t('All 12 other quests must be completed before the crown is awarded.')}</p>}
          {complete&&m.finale&&<p className="mt-3 text-sm text-amber-300">✦ {t('Chapter crown unlocked')}</p>}
        </article>;
      })}
    </section>)}
    </div>
    <Sheet open={ranksOpen} onClose={()=>setRanksOpen(false)} title={t('Rank ladder & XP')}>
      <div className="mb-4 grid grid-cols-2 gap-2"><div className="card text-center"><b>{game.recordXp} XP</b><p className="text-xs text-ink-3">{t('From sessions')}</p></div><div className="card text-center"><b>{game.missionXp} XP</b><p className="text-xs text-ink-3">{t('From missions')}</p></div></div>
      <p className="mb-2 text-sm text-ink-2">{t('Each completed intercourse record earns 25 XP. Active time adds up to 80 XP: round(80 × (minutes / 40)^1.4), capped at 40 minutes. Oral records earn no XP.')}</p>
      <p className="mb-4 text-xs text-ink-3">{t('Existing intercourse records count automatically. Their original session scores stay unchanged. Missing active time earns base XP only. Corrections and deletions update rewards.')}</p>
      <p className="mb-4 text-sm text-rose-2">{t('Top rank requires {xp} XP. Only intercourse records and missions earn XP.',{xp:TOP_RANK_XP.toLocaleString()})}</p>
      <p className="mb-4 text-xs text-ink-3">{t('The first upgrade costs 150 XP. Every following upgrade costs 100 XP more than the previous one.')}</p>
      <ol className="space-y-2">{RANKS.map((title,i)=><li key={title} className={`flex items-center gap-3 rounded-2xl border p-3 ${game.rank.level===i+1?'border-rose bg-rose/10':'border-line'}`}><span className="text-lg font-bold text-rose-2">{i+1}</span><div className="flex-1"><p className="font-semibold">{t(title)}</p><p className="text-xs text-ink-3">{rankThreshold(i).toLocaleString()} XP</p></div>{game.rank.level>i?'✦':'◇'}</li>)}</ol>
    </Sheet>

  </div>;
}
