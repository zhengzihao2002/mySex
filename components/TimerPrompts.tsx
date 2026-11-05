'use client';
import { SymbolIcon } from '@/components/SymbolIcon';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {motion,useReducedMotion} from 'motion/react';
import {lockPageScroll} from '@/lib/page-scroll-lock';
import {TIMER_PROMPTS,nextPrompt} from '@/lib/session-play';
import {useT} from './I18nProvider';

export function TimerPrompts({onClose}:{onClose:()=>void}) {
 const {t}=useT();
 const dialog=useRef<HTMLDialogElement>(null);
 const [index]=useState(()=>nextPrompt(-1,Math.random,true));
 const [revealed,setRevealed]=useState(false);
 const [ready,setReady]=useState(false);
 const [closing,setClosing]=useState(false);
 const eligibleAt=useRef(Infinity);
 const reduced=useReducedMotion();
 const dismiss=()=>{if(revealed&&performance.now()>=eligibleAt.current)setClosing(true);};
 useLayoutEffect(()=>{
   const node=dialog.current;if(!node)return;
   const previous=document.activeElement;
   const unlock=lockPageScroll();
   eligibleAt.current=performance.now()+3000;
   node.showModal();node.focus({preventScroll:true});
   return()=>{node.close();unlock();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{
   const allow=setTimeout(()=>setReady(true),3000);
   const expire=setTimeout(()=>setClosing(true),30000);
   return()=>{clearTimeout(allow);clearTimeout(expire);};
 },[]);
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
 Lotus:t('Sit face to face, with legs wrapped around each other.'),
 Butterfly:t('One partner lies near the bed edge; the other stands facing them.'),
 'Coital alignment':t('Lie face to face, with the upper partner positioned slightly higher.'),
 Prone:t('One partner lies face down; the other stays close behind.'),
 'Legs raised':t('One partner lies back with knees raised.'),
 'Legs over shoulders':t('One partner lies back with legs resting on the other’s shoulders.'),
 'Kneeling face to face':t('Both kneel upright, facing each other.'),
 'Kneeling from behind':t('One partner kneels upright; the other kneels behind.'),
 'Edge of bed':t('One partner sits at a sturdy bed edge; the other faces them.'),
 'Reverse seated':t('One partner sits securely; the other sits on their lap, facing away.'),
 'Side saddle':t('One partner lies back; the other sits sideways across their lap.'),
 Scissors:t('Lie on your sides with your legs comfortably interlaced.'),
 Bridge:t('One partner lies back with knees bent and hips comfortably raised.'),
 Squatting:t('One partner lies back; the other squats above, using support.'),
 'Standing from behind':t('Both stand close, facing the same direction.'),
 'Seated leaning back':t('Sit face to face, with one partner leaning back on their hands.'),
 };
 const position=TIMER_PROMPTS[index];
 return createPortal(<dialog ref={dialog} className="position-reveal" aria-label={t('Discover a random position')} tabIndex={-1}
   onCancel={event=>{event.preventDefault();dismiss();}}>
   <motion.div className="position-reveal-stage" initial={{opacity:0}} animate={{opacity:closing?0:1}} transition={{duration:reduced?0:.35}}
     onClick={event=>{if(event.target===event.currentTarget)dismiss();}}>
     <motion.div className="position-reveal-card" initial={{y:36,scale:.72,rotate:-8,opacity:0}} animate={closing?{y:30,scale:.8,rotate:5,opacity:0}:{y:0,scale:1,rotate:0,opacity:1}}
       transition={{duration:reduced?0:.45,ease:[.22,1,.36,1]}} onAnimationComplete={()=>{if(closing)onClose();}}>
       <button type="button" className="position-reveal-inner block text-center" aria-label={revealed?`${t(position)}. ${descriptions[position]} ${t('Put card away')}`:t('Revealing…')} aria-disabled={!revealed||!ready||closing} onClick={dismiss}
         onAnimationEnd={event=>{if(event.target===event.currentTarget&&event.animationName==='position-reveal-flip')setRevealed(true);}}>
         <span aria-hidden={revealed} className="position-reveal-face"><span className="absolute left-5 top-4 text-rose-2"><SymbolIcon value="❤️" size={18}/></span><SymbolIcon value="🃏" size={64}/><span className="absolute bottom-4 right-5 rotate-180 text-rose-2"><SymbolIcon value="❤️" size={18}/></span></span>
         <span aria-hidden={!revealed} className="position-reveal-face position-reveal-front"><span className="absolute left-5 top-4 text-rose-2"><SymbolIcon value="❤️" size={18}/></span><span className="font-display text-2xl leading-tight">{t(position)}</span><span className="text-sm leading-relaxed text-ink-2">{descriptions[position]}</span><span className="absolute bottom-4 right-5 rotate-180 text-rose-2"><SymbolIcon value="❤️" size={18}/></span></span>
       </button>
     </motion.div>
     <div className="position-reveal-dismiss">{revealed&&<motion.button type="button" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.2}} className="min-h-11 rounded-full border border-rose/20 bg-surface/70 px-5 text-sm text-ink-2 disabled:opacity-50" disabled={!ready||closing} onClick={dismiss}>{t('Put card away')}</motion.button>}</div>
   </motion.div>
 </dialog>,document.body);
}
