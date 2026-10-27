'use client';
import {useEffect,useRef,useState} from 'react';
import {TIMER_PROMPTS,nextPrompt} from '@/lib/session-play';
import {useT} from './I18nProvider';
export function TimerPrompts({paused,kind}:{paused:boolean;kind:'intercourse'|'oral'}){
 const {t}=useT();const [index,setIndex]=useState(-1);const [front,setFront]=useState(false);const lockedUntil=useRef(0);
 useEffect(()=>{if(!front)return;const timer=setTimeout(()=>{lockedUntil.current=Date.now()+450;setFront(false)},30450);return()=>clearTimeout(timer)},[front]);
 const flip=()=>{if(Date.now()<lockedUntil.current)return;lockedUntil.current=Date.now()+450;
 if(front)setFront(false);else if(!paused){setIndex(i=>nextPrompt(i,Math.random,kind!=='oral'));setFront(true)}};
 return <div className="w-full text-center" style={{perspective:'900px'}}>
 <style>{'@media (prefers-reduced-motion: reduce) { .position-card-inner { transition: none !important; } }'}</style>
 <button type="button" aria-label={front&&index>=0?t(TIMER_PROMPTS[index]):t('Flip')} aria-pressed={front} disabled={paused&&!front} onClick={flip} className="relative block h-24 w-full rounded-3xl disabled:opacity-50">
 <span className="position-card-inner absolute inset-0 block" style={{transformStyle:'preserve-3d',transform:front?'rotateY(180deg)':'rotateY(0deg)',transition:'transform 450ms cubic-bezier(0.22, 0.61, 0.36, 1)'}}>
 <span aria-hidden={front} className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-rose/40 bg-gradient-to-br from-plum/30 to-rose/20 px-4 shadow-lg" style={{backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden'}}><span className="text-lg">🃏</span><span className="text-sm font-semibold">{paused?t('Paused'):t('Flip')}</span></span>
 <span aria-hidden={!front} className="absolute inset-0 flex items-center justify-center rounded-3xl border border-rose/40 bg-gradient-to-br from-plum/30 to-rose/20 px-4 text-sm font-semibold shadow-lg" style={{transform:'rotateY(180deg)',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden'}}>{index>=0?t(TIMER_PROMPTS[index]):''}</span>
 </span></button></div>;
}
