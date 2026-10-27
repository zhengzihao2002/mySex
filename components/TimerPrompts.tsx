'use client';
import {useEffect,useRef,useState} from 'react';
import {TIMER_PROMPTS,nextPrompt} from '@/lib/session-play';
import {useT} from './I18nProvider';
export function TimerPrompts({paused,kind}:{paused:boolean;kind:'intercourse'|'oral'}){
 const {t}=useT();const [index,setIndex]=useState(-1);const [front,setFront]=useState(false);const lockedUntil=useRef(0);
 const descriptions:Record<(typeof TIMER_PROMPTS)[number],string>={
 Missionary:t('One partner lies on their back; the other is above, face to face.'),
 Doggy:t('One partner rests on hands and knees; the other kneels behind.'),
 Cowgirl:t('One partner lies back; the other sits on top, facing them.'),
 'Reverse cowgirl':t('One partner lies back; the other sits on top, facing away.'),
 Spooning:t('Both lie on the same side, with one partner nestled behind the other.'),
 Standing:t('Both stand close together, using a wall for balance.'),
 '69':t('Lie on your sides in opposite directions, each head near the other’s hips.'),
 'Side by side':t('Lie on your sides, facing each other.'),
 Seated:t('One partner sits securely; the other sits on their lap, facing them.'),
 };
 const position=index>=0?TIMER_PROMPTS[index]:null;
 useEffect(()=>{if(!front)return;const timer=setTimeout(()=>{lockedUntil.current=Date.now()+450;setFront(false)},30450);return()=>clearTimeout(timer)},[front]);
 const flip=()=>{if(Date.now()<lockedUntil.current)return;lockedUntil.current=Date.now()+450;
 if(front)setFront(false);else if(!paused){setIndex(i=>nextPrompt(i,Math.random,kind!=='oral'));setFront(true)}};
 return <div className="w-full text-center" style={{perspective:'900px'}}>
 <style>{'@media (prefers-reduced-motion: reduce) { .position-card-inner { transition: none !important; } }'}</style>
 <button type="button" aria-label={front&&position?`${t(position)}. ${descriptions[position]}`:t('Flip')} aria-pressed={front} disabled={paused&&!front} onClick={flip} className="relative mx-auto block rounded-2xl disabled:opacity-50" style={{width:'clamp(140px, 38vw, 156px)',aspectRatio:'5 / 7'}}>
 <span className="position-card-inner absolute inset-0 block" style={{transformStyle:'preserve-3d',transform:front?'rotateY(180deg)':'rotateY(0deg)',transition:'transform 450ms cubic-bezier(0.22, 0.61, 0.36, 1)'}}>
 <span aria-hidden={front} className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose/40 bg-gradient-to-br from-plum/30 to-rose/20 px-4 shadow-lg" style={{backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden'}}><span className="pointer-events-none absolute inset-2 rounded-xl border border-rose/20"/><span className="absolute left-4 top-3 text-xs text-rose">♥</span><span className="text-3xl">🃏</span><span className="text-sm font-semibold">{paused?t('Paused'):t('Flip')}</span><span className="absolute bottom-3 right-4 rotate-180 text-xs text-rose">♥</span></span>
 <span aria-hidden={!front} className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose/40 bg-gradient-to-br from-plum/30 to-rose/20 px-4 shadow-lg" style={{transform:'rotateY(180deg)',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden'}}><span className="absolute left-3 top-2 text-xs text-rose">♥</span><span className="text-base font-semibold leading-tight">{position?t(position):''}</span><span className="text-xs leading-relaxed text-ink-2">{position?descriptions[position]:''}</span><span className="absolute bottom-2 right-3 rotate-180 text-xs text-rose">♥</span></span>
 </span></button></div>;
}
