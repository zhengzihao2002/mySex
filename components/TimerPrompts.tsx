'use client';
import {useEffect,useState} from 'react';
import {TIMER_PROMPTS,nextPrompt} from '@/lib/session-play';
import {useT} from './I18nProvider';
export function TimerPrompts({paused,kind}:{paused:boolean;kind:'intercourse'|'oral'}) {
 const {t}=useT();const [enabled,setEnabled]=useState(false);const [auto,setAuto]=useState(false);const [index,setIndex]=useState(-1);
 const next=()=>setIndex(previous=>nextPrompt(previous,Math.random,kind!=='oral'));
 useEffect(()=>{if(!enabled||!auto||paused)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')setIndex(previous=>nextPrompt(previous,Math.random,kind!=='oral'))},90000);return()=>clearInterval(timer)},[enabled,auto,paused,kind]);
 if(!enabled)return <button className="btn-ghost mb-2 w-full" disabled={paused} onClick={()=>{setEnabled(true);next()}}>{t('Shuffle a timer prompt')}</button>;
 return <div className="mb-3 rounded-2xl bg-surface-2 p-3 text-center text-sm">
 <p aria-live="polite">{paused?t('Prompts paused'):index>=0?t(TIMER_PROMPTS[index]):''}</p>
 <p className="mt-1 text-xs text-ink-3">{t('Only if you both want to. Skip anything, anytime.')}</p>
 <div className="mt-2 flex flex-wrap justify-center gap-3"><button disabled={paused} onClick={next}>{t('Next prompt')}</button><button aria-pressed={auto} onClick={()=>setAuto(!auto)}>{auto?t('Auto prompts: on'):t('Auto prompts: off')}</button><button onClick={()=>{setEnabled(false);setAuto(false)}}>{t('Stop prompts')}</button></div>
 </div>;
}
