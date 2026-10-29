'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useT} from '@/components/I18nProvider';
import {useTz} from '@/components/TzProvider';
import {useRun} from '@/components/useRun';
import {FormError} from '@/components/FormError';
import {Sheet} from '@/components/Sheet';
import {CoupleProgress} from '@/components/CoupleProgress';
import {changeMission} from '@/app/mission-actions';
import {MISSIONS,RANKS,TOP_RANK_RECORD_TARGET,TOP_RANK_XP,rankThreshold,progression,missionUnlocked,type MissionRun} from '@/lib/progression';
import type {SexSession} from '@/lib/types';

export function MissionsView({sessions,runs,meId,partnerName}:{sessions:SexSession[];runs:MissionRun[];meId:string;partnerName:string}) {
  const {t,f}=useT(),{tz}=useTz(),router=useRouter();
  const kind='intercourse' as const;
  const [ranksOpen,setRanksOpen]=useState(false),[confirm,setConfirm]=useState<string|null>(null);
  const act=useRun();const game=useMemo(()=>progression(sessions,runs),[sessions,runs]);
  // Keep two phones in sync without push notifications or background polling.
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')router.refresh();};const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[router]);
  const perform=(input:Parameters<typeof changeMission>[0])=>act.run(()=>changeMission(input));
  const paths=[{key:'explorer',title:t('Explorer'),icon:'🧭'},{key:'endurance',title:t('Endurance'),icon:'🔥'},{key:'rhythm',title:t('Rhythm'),icon:'🌙'},{key:'finale',title:t('Chapter finale'),icon:'👑'}];
  return <div className="space-y-5 pt-2 pb-4">
    <header><Link href="/play" className="inline-flex min-h-11 items-center text-sm text-ink-3">← {t('Play')}</Link><h1 className="font-display text-3xl font-bold">{t('Couple quests')}</h1><p className="mt-1 text-sm text-ink-2">{t('Two players. One legendary story.')}</p></header>
    <CoupleProgress sessions={sessions} runs={runs}/>
    <button className="btn-ghost w-full" onClick={()=>setRanksOpen(true)}>{t('Rank ladder & XP')}</button>
    <p className="text-xs text-ink-3">{t('Both accept first. Only sessions started afterwards count. Breaks are free; stop or skip anytime.')}</p>
    <FormError error={act.error}/>
    {paths.map(path=><section key={path.key} className="space-y-3">
      <h2 className="font-display text-xl font-bold">{path.icon} {path.title}</h2>
      {MISSIONS.filter(m=>m.path===path.key).map(m=>{
        const quest=game.quests.find(q=>q.run.kind===kind&&q.mission.key===m.key),run=quest?.run;
        const unlocked=missionUnlocked(m,kind,runs,sessions),complete=quest?.complete;
        const status=run?.skippedAt?t('Skipped'):complete?t('Completed'):run?.acceptedAt?t('In progress'):run?run.requestedBy===meId?t('Waiting for {name}',{name:partnerName}):t('Your agreement needed'):unlocked?t('Ready to unlock'):t('Locked');
        return <article key={m.key} className={`rounded-3xl border p-4 ${complete?'border-amber-300/40 bg-amber-300/5':run?.acceptedAt?'border-rose/50 bg-rose/5':'border-line bg-surface'}`}>
          <div className="flex items-start justify-between gap-3"><div><p className={`text-xs ${complete?'text-amber-300':'text-rose-2'}`}>{complete?'🏆 ':''}{status}</p><h3 className="mt-1 font-semibold">{t(m.title)}</h3></div><span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">+{m.xp} XP</span></div>
          <p className="mt-2 text-sm text-ink-2">{t(m.description)}</p>
          {run?.acceptedAt&&!run.skippedAt&&quest&&<div className="mt-3"><div className="mb-1 flex justify-between text-xs text-ink-2"><span>{t('Progress')}</span><b>{Math.floor(quest.value)}/{quest.target}{m.rule==='minutes'?` ${t('min')}`:''}</b></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-rose to-amber-300 transition-all motion-reduce:transition-none" style={{width:`${quest.value/quest.target*100}%`}}/></div></div>}
          {!!quest?.evidence.length&&<details className="mt-3 text-xs text-ink-2"><summary className="cursor-pointer py-2">{t('Saved record proof')} · {quest.evidence.length}</summary><div className="flex flex-wrap gap-2">{quest.evidence.map(id=>{const s=sessions.find(s=>s.id===id);return s?<Link className="chip" key={id} href={`/insights?session=${id}`}>{f.prettyDate(s.startedAt.slice(0,10))} · {f.formatDuration(s.durationSec??0)}</Link>:null;})}</div></details>}
          {!complete&&<div className="mt-3 flex flex-wrap gap-2">
            {!run&&unlocked&&<button className="btn-primary flex-1" disabled={act.pending} onClick={()=>perform({action:'invite',key:m.key,kind,timeZone:tz})}>{t('Accept & invite partner')}</button>}
            {!run&&unlocked&&<button className="btn-ghost" disabled={act.pending} onClick={()=>perform({action:'skip',key:m.key,kind,timeZone:tz})}>{t('Skip')}</button>}
            {!run&&!unlocked&&<p className="text-xs text-ink-3">{m.rule==='finale'?t('Complete or skip the three paths through the 30-minute mission.'):t('Complete the earlier mission first.')}</p>}
            {run&&!run.acceptedAt&&!run.skippedAt&&run.requestedBy!==meId&&<button className="btn-primary flex-1" disabled={act.pending} onClick={()=>perform({action:'accept',id:run.id})}>{t('Accept mission')}</button>}
            {run?.acceptedAt&&!run.skippedAt&&<Link className="btn-primary flex-1" href={`/timer?kind=${kind}`}>{t('Record a session')}</Link>}
            {run&&<button className="btn-ghost" disabled={act.pending} onClick={()=>setConfirm(run.id)}>{run.skippedAt?t('Try this mission'):run.acceptedAt?t('Abandon mission'):run.requestedBy===meId?t('Withdraw'):t('Decline')}</button>}
          </div>}
          {run&&!run.acceptedAt&&!run.skippedAt&&<p className="mt-2 text-xs text-ink-3">{t('Invitation expires in {n} days.',{n:Math.max(0,Math.ceil((new Date(run.createdAt).getTime()+7*86400000-Date.now())/86400000))})}</p>}
          {complete&&m.rule==='finale'&&<p className="mt-3 text-sm text-amber-300">✦ {t('Chapter crown unlocked')}</p>}
        </article>;
      })}
    </section>)}
    <Sheet open={ranksOpen} onClose={()=>setRanksOpen(false)} title={t('Rank ladder & XP')}>
      <div className="mb-4 grid grid-cols-2 gap-2"><div className="card text-center"><b>{game.recordXp} XP</b><p className="text-xs text-ink-3">{t('From sessions')}</p></div><div className="card text-center"><b>{game.missionXp} XP</b><p className="text-xs text-ink-3">{t('From missions')}</p></div></div>
      <p className="mb-2 text-sm text-ink-2">{t('Each new intercourse record earns 25 XP. Active time adds up to 80 XP: round(80 × (minutes / 40)^1.4), capped at 40 minutes. Oral records earn no XP.')}</p>
      <p className="mb-4 text-xs text-ink-3">{t('XP comes from valid saved records, not the Save button. Corrections and deletions update rewards. Classic records keep their old scores and do not earn retroactive XP.')}</p>
      <p className="mb-4 text-sm text-rose-2">{t('Top rank requires {xp} XP and at least {n} completed intercourse records. Shorter sessions take more records.',{xp:TOP_RANK_XP.toLocaleString(),n:TOP_RANK_RECORD_TARGET.toLocaleString()})}</p>
      <p className="mb-4 text-sm text-ink-2">{t('Intercourse progress: {n} / {total}',{n:game.intercourseRecords.toLocaleString(),total:TOP_RANK_RECORD_TARGET.toLocaleString()})}</p>
      <ol className="space-y-2">{RANKS.map((title,i)=><li key={title} className={`flex items-center gap-3 rounded-2xl border p-3 ${game.rank.level===i+1?'border-rose bg-rose/10':'border-line'}`}><span className="text-lg font-bold text-rose-2">{i+1}</span><div className="flex-1"><p className="font-semibold">{t(title)}</p><p className="text-xs text-ink-3">{rankThreshold(i).toLocaleString()} XP</p></div>{game.rank.level>i?'✦':'◇'}</li>)}</ol>
    </Sheet>
    <Sheet open={!!confirm} onClose={()=>setConfirm(null)} title={t('Leave this mission?')}><p className="mb-4 text-sm text-ink-2">{t('Its invitation or unfinished progress will be removed. Saved sessions and their XP stay. You can invite each other again later.')}</p><button className="btn-primary w-full" disabled={act.pending} onClick={async()=>{if(confirm&&await perform({action:'abandon',id:confirm}))setConfirm(null);}}>{t('Leave mission')}</button><FormError error={act.error}/></Sheet>
  </div>;
}
