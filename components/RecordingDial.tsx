'use client';

import {useId} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {useRingCompletion} from './useRingCompletion';
import {useT} from './I18nProvider';
import {formatClock} from '@/lib/dates';

const OUTER=132,INNER=112;

export function RecordingDial({seconds,paused,pending,caption,breakNo,breakSeconds,totalBreak}:{seconds:number;paused:boolean;pending:boolean;caption:string;breakNo:number;breakSeconds:number;totalBreak:number}) {
  const {t,f}=useT();
  const id=useId();
  const reduced=!!useReducedMotion();
  const secondsLap=useRingCompletion(seconds,60,reduced);
  const minutesLap=useRingCompletion(seconds,3600,reduced);
  const secondsFraction=(seconds%60)/60;
  const minutesFraction=(seconds%3600)/3600;
  const angle=secondsFraction*2*Math.PI-Math.PI/2;
  return <figure className="recording-dial" aria-label={t('Live timer')}>
    <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff7aa8"/><stop offset="55%" stopColor="#ff3d7f"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
      {Array.from({length:60},(_,i)=>{
        const a=i/60*2*Math.PI-Math.PI/2,long=i%5===0;
        return <line key={i} x1={150+146*Math.cos(a)} y1={150+146*Math.sin(a)} x2={150+(long?140:143)*Math.cos(a)} y2={150+(long?140:143)*Math.sin(a)} stroke={i/60<=secondsFraction?'#ff7aa8':'#ffffff24'} strokeWidth={long?2:1} strokeLinecap="round"/>;
      })}
      <circle cx="150" cy="150" r={OUTER} fill="none" stroke="#ffffff12" strokeWidth="6"/>
      <circle className="recording-seconds-progress" cx="150" cy="150" r={OUTER} fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${secondsFraction*2*Math.PI*OUTER} ${2*Math.PI*OUTER}`} transform="rotate(-90 150 150)"/>
      {secondsLap.completed!==null&&<motion.circle key={`seconds-${secondsLap.completed}`} className="recording-seconds-completion" cx="150" cy="150" r={OUTER} fill="none" stroke={`url(#${id})`} strokeWidth="6" style={{filter:'drop-shadow(0 0 3px #ff3d7f88)'}}
        initial={{opacity:1,r:OUTER,strokeWidth:6}} animate={{opacity:[1,.75,0],r:[OUTER,OUTER+2,OUTER+8],strokeWidth:[6,7,1]}}
        transition={{duration:.75,times:[0,.25,1],ease:'easeOut'}} onAnimationComplete={()=>secondsLap.complete(secondsLap.completed!)}/> }
      <circle cx="150" cy="150" r={INNER} fill="none" stroke="#a78bfa1f" strokeWidth="3"/>
      <circle className="recording-minutes-progress" cx="150" cy="150" r={INNER} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${minutesFraction*2*Math.PI*INNER} ${2*Math.PI*INNER}`} transform="rotate(-90 150 150)"/>
      {minutesLap.completed!==null&&<motion.circle key={`minutes-${minutesLap.completed}`} className="recording-minutes-completion" cx="150" cy="150" r={INNER} fill="none" stroke="#a78bfa" strokeWidth="3" style={{filter:'drop-shadow(0 0 3px #a78bfa88)'}}
        initial={{opacity:1,r:INNER,strokeWidth:3}} animate={{opacity:[1,.75,0],r:[INNER,INNER+2,INNER+7],strokeWidth:[3,4,1]}}
        transition={{duration:.75,times:[0,.25,1],ease:'easeOut'}} onAnimationComplete={()=>minutesLap.complete(minutesLap.completed!)}/> }
      <circle className="recording-marker" cx={150+OUTER*Math.cos(angle)} cy={150+OUTER*Math.sin(angle)} r="6" fill="#fff" stroke="#ff7aa8" strokeWidth="2"/>
    </svg>
    <div className="recording-dial-center">
      <svg viewBox="0 0 24 24" className="recording-heart animate-beat fill-rose" style={{animationPlayState:paused?'paused':'running',opacity:paused ? 0.45 : 1}} aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z"/></svg>
      <span className={`recording-time tabular-nums ${seconds>=3600?'recording-time-long':''} ${paused?'text-ink-2':''}`} role="timer" aria-label={t('Active time')} aria-live="off">{formatClock(seconds)}</span>
      <span className="recording-caption">{pending?t('Starting…'):paused?<>{t('Break #{n}',{n:Math.max(1,breakNo)})} · <span className="tabular-nums text-luteal">{formatClock(breakSeconds)}</span></>:caption}</span>
      {breakNo>0&&<span className="recording-breaks text-ink-3">{f.plural(breakNo,t('{n} break',{n:breakNo}),t('{n} breaks',{n:breakNo}))} · {t('{d} total',{d:f.formatDuration(totalBreak)})}</span>}
    </div>
  </figure>;
}
