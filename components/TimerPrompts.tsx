'use client';
import {useState} from 'react';
import {TIMER_PROMPTS,nextPrompt} from '@/lib/session-play';
import {useT} from './I18nProvider';
export function TimerPrompts({paused,kind}:{paused:boolean;kind:'intercourse'|'oral'}){
 const {t}=useT();const [index,setIndex]=useState(-1);const [turn,setTurn]=useState(0);
 return <div className="w-full text-center" style={{perspective:'900px'}}><button type="button" disabled={paused} onClick={()=>{setIndex(i=>nextPrompt(i,Math.random,kind!=='oral'));setTurn(n=>n+1)}} className="w-full rounded-3xl border border-rose/40 bg-gradient-to-br from-plum/30 to-rose/20 px-4 py-3 shadow-lg transition-transform duration-500 disabled:opacity-50" style={{transform:`rotateY(${turn*360}deg)`}}>
 <span className="block text-lg">🃏</span><span className="mt-1 block text-sm font-semibold" aria-live="polite">{paused?t('Paused'):index<0?t('Flip'):t(TIMER_PROMPTS[index])}</span>
 </button></div>;
}
