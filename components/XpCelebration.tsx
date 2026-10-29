'use client';
import {progressFillStyle} from '@/lib/progress-style';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {coupleRank,RANKS,rankThreshold,MISSIONS} from '@/lib/progression';
import type {SaveCelebration,XpReward} from '@/lib/session-rewards';
import {useT} from './I18nProvider';
import {ScoreReveal} from './ScoreBadge';

export function SavedSessionReveal({celebration,onClose}:{celebration:SaveCelebration;onClose:()=>void}) {
  const [watching,setWatching]=useState(!!celebration.reward);
  const s=celebration.session;
  return <>
    <ScoreReveal score={celebration.score} times={{startedAt:s.startedAt,activeSec:s.durationSec??0,breakSec:s.pausedSec,breaks:s.breaks}} onClose={onClose}/>
    {watching&&celebration.reward&&<XpCelebration reward={celebration.reward} onContinue={()=>setWatching(false)}/>}
  </>;
}

/** The native modal prevents backdrop/Escape dismissal and traps focus until Continue. */
export function XpCelebration({reward,onContinue}:{reward:XpReward;onContinue:()=>void}) {
  const {t}=useT();const dialog=useRef<HTMLDialogElement>(null);
  const [frame,setFrame]=useState(()=>({xp:reward.beforeXp,level:coupleRank(reward.beforeXp).level,ready:false}));
  const initial=coupleRank(reward.beforeXp),final=coupleRank(reward.afterXp);
  useEffect(()=>{
    const node=dialog.current;if(!node)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    node.showModal();node.focus({preventScroll:true});
    return()=>{node.close();document.body.style.overflow=overflow;};
  },[]);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const segments:{start:number;end:number;level:number}[]=[];
    let start=reward.beforeXp,rank=coupleRank(start);
    while(start<reward.afterXp){
      const end=Math.min(reward.afterXp,rank.ceiling??reward.afterXp);
      segments.push({start,end,level:rank.level});start=end;rank=coupleRank(start);
    }
    if(!segments.length)segments.push({start,end:start,level:rank.level});
    const intro=reduced?250:700,duration=reduced?220:Math.max(550,Math.min(1500,2400/segments.length)),pause=reduced?50:280;
    let raf=0,last=0,elapsed=0;
    const tick=(now:number)=>{
      if(!last)last=now;
      if(!document.hidden)elapsed+=Math.min(64,now-last);
      last=now;
      if(reduced){
        const ready=elapsed>=1000;
        if(elapsed>=350)setFrame({xp:reward.afterXp,level:final.level,ready});
        if(!ready)raf=requestAnimationFrame(tick);
        return;
      }
      if(elapsed<intro){raf=requestAnimationFrame(tick);return;}
      const n=Math.min(segments.length-1,Math.floor((elapsed-intro)/(duration+pause)));
      const local=Math.min(1,(elapsed-intro-n*(duration+pause))/duration);
      const segment=segments[n],ease=local<0.5?2*local*local:1-Math.pow(-2*local+2,2)/2;
      const xp=Math.round(segment.start+(segment.end-segment.start)*ease);
      const ready=elapsed>=intro+segments.length*(duration+pause)+200;
      setFrame(ready?{xp:reward.afterXp,level:final.level,ready:true}:{xp,level:segment.level,ready:false});
      if(!ready)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[reward.beforeXp,reward.afterXp,final.level]);
  const floor=rankThreshold(frame.level-1),ceiling=frame.level<RANKS.length?rankThreshold(frame.level):null;
  const progress=ceiling?Math.max(0,Math.min(1,(frame.xp-floor)/(ceiling-floor))):1;
  const gained=Math.max(0,reward.afterXp-reward.beforeXp);
  const upgraded=frame.level>initial.level;
  return typeof document==='undefined'?null:createPortal(<dialog ref={dialog} aria-labelledby="xp-reward-title" tabIndex={-1} onCancel={e=>e.preventDefault()}
    className="xp-celebration m-auto max-h-[94dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-[32px] border border-rose/40 bg-surface p-6 text-ink shadow-2xl outline-none">
    <div className="pointer-events-none absolute inset-x-8 top-0 h-32 rounded-full bg-rose/20 blur-3xl"/>
    <div className="relative space-y-5 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-rose-2">✦ {t('Intercourse saved')}</p>
      <h2 id="xp-reward-title" className="font-display text-2xl font-bold">{t('Your story levels up')}</h2>
      <p className="text-xs text-ink-3">{t('Started at level {level} · {xp} XP',{level:initial.level,xp:reward.beforeXp.toLocaleString()})}</p>
      <div key={frame.level} className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 bg-gradient-to-br from-plum/40 to-rose/20 shadow-lg ${upgraded?'border-amber-300/80 shadow-amber-300/15':'border-rose/60 shadow-rose/20'} motion-safe:animate-fade`}>
        <span className="text-4xl font-bold tabular-nums">{frame.level}</span>
      </div>
      <div key={`title-${frame.level}`} className="min-h-16 motion-safe:animate-fade"><p className="mb-1 text-xs font-semibold text-amber-300">{upgraded?t('Level up!'):t('Level {n}',{n:frame.level})}</p><p className="font-display text-2xl font-bold">{t(RANKS[frame.level-1])}</p></div>
      <div className="rounded-2xl border border-line bg-bg/40 p-4 text-left">
        <div className="mb-3 flex justify-between gap-2 text-sm"><span className="text-ink-2">{t('Total XP')}</span><b className="tabular-nums">{frame.xp.toLocaleString()} XP</b></div>
        <div role="progressbar" aria-label={t('Level progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress*100)} className="h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gradient-to-r from-rose via-fuchsia-400 to-amber-300 shadow-[0_0_14px_rgba(255,61,127,0.5)]" style={progressFillStyle(progress)}/>
        </div>
        <p className="mt-2 min-h-4 text-xs text-ink-3">{ceiling?`${Math.max(0,frame.xp-floor).toLocaleString()} / ${(ceiling-floor).toLocaleString()} XP`:t('Highest rank unlocked')}</p>
      </div>
      <div className="rounded-2xl bg-rose/10 p-3"><p className="text-2xl font-bold text-rose-2">+{gained.toLocaleString()} XP</p><p className="mt-1 text-xs text-ink-2">{t('{session} session XP · {quests} quest XP',{session:reward.sessionXp,quests:Math.max(0,reward.missionXp)})}</p></div>
      {reward.completedMissions.length>0&&<div className="flex flex-wrap justify-center gap-2">{reward.completedMissions.map(key=>{const m=MISSIONS.find(m=>m.key===key);return m?<span key={key} className="rounded-full border border-amber-300/30 bg-amber-300/5 px-3 py-1 text-xs text-amber-300">🏆 {t(m.title)}</span>:null;})}</div>}
      <p className="sr-only" role="status">{frame.ready?t('XP added. Level {level}: {title}',{level:final.level,title:t(final.title)}):t('Adding earned XP…')}</p>
      <button type="button" className="btn-primary min-h-12 w-full" disabled={!frame.ready} onClick={()=>{if(frame.ready)onContinue();}}>{frame.ready?t('Continue'):t('Adding earned XP…')}</button>
    </div>
  </dialog>,document.body);
}
