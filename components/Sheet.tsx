'use client';

import {useEffect,useLayoutEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,MotionConfig,useIsPresent,useDragControls} from 'motion/react';
import {X} from 'lucide-react';
import {useT} from './I18nProvider';
import {lockPageScroll} from '@/lib/page-scroll-lock';

type SheetProps={open:boolean;onClose:()=>void;title?:React.ReactNode;children:React.ReactNode;viewKey?:string;stableHeight?:boolean};

export function Sheet(props:SheetProps) {
  if(typeof document==='undefined')return null;
  return createPortal(<MotionConfig reducedMotion="never"><AnimatePresence>{props.open&&<SheetPanel {...props}/>}</AnimatePresence></MotionConfig>,document.body);
}

function SheetPanel({onClose,title,children,viewKey,stableHeight=false}:Omit<SheetProps,'open'>) {
  const present=useIsPresent();
  const dragControls=useDragControls();
  const {t}=useT();
  const titleId=useId();
  const content=useRef<HTMLDivElement>(null);
  const root=useRef<HTMLDivElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const previousView=useRef(viewKey);
  useLayoutEffect(()=>{
    if(content.current){
      content.current.scrollTop=0;
      if(previousView.current!==viewKey)dialog.current?.focus({preventScroll:true});
    }
    previousView.current=viewKey;
  },[viewKey]);
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;},[onClose]);
  useLayoutEffect(()=>{
    if(!root.current||!dialog.current)return;
    const node=root.current;
    const panel=dialog.current;
    const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    // Measure the edge-anchored overlay itself, before acquiring the scroll lock.
    let layoutWidth=document.documentElement.clientWidth;
    let layoutHeight=node.clientHeight;
    let panelHeight=panel.offsetHeight;
    const unlock=lockPageScroll();
    const top=()=>Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)===node;
    const viewport=window.visualViewport;
    // Session forms keep their panel height when the keyboard opens. Only the
    // inner scroll area follows the visible space; its background stays solid
    // behind the keyboard rather than exposing the page underneath.
    let frame=0;
    const keepFocusVisible=()=>{
      if(!top()||!content.current)return;
      const active=document.activeElement;
      if(!(active instanceof HTMLElement)||!active.matches('input,textarea,select,[contenteditable="true"]')||!content.current.contains(active))return;
      const field=active.getBoundingClientRect(),area=content.current.getBoundingClientRect();
      const bottom=Math.min(area.bottom,(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight))-12;
      if(field.bottom>bottom)content.current.scrollTop+=field.bottom-bottom;
      else if(field.top<area.top+12)content.current.scrollTop+=field.top-area.top-12;
    };
    const resize=()=>{
      const active=document.activeElement;
      const typing=active instanceof HTMLElement&&panel.contains(active)&&active.matches('input,textarea,select,[contenteditable="true"]');
      const width=document.documentElement.clientWidth;
      if(width!==layoutWidth){layoutWidth=width;layoutHeight=node.clientHeight;panelHeight=Math.round(layoutHeight*.92);}
      const keyboardOpen=typing&&layoutHeight-(viewport?.height??window.innerHeight)>120;
      if(stableHeight&&keyboardOpen){
        // Hold only the panel's size during typing. Never freeze the root/body
        // viewport: its four fixed edges must continue to cover the screen.
        Object.assign(panel.style,{position:'absolute',top:`${(viewport?.offsetTop??0)+layoutHeight-panelHeight}px`,height:`${panelHeight}px`,maxHeight:'none',marginBottom:''});
        if(content.current){
          const visibleBottom=(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight);
          content.current.style.maxHeight=`${Math.max(0,visibleBottom-panel.offsetTop-panel.clientTop-content.current.offsetTop)}px`;
        }
      }else{
        Object.assign(panel.style,{position:'',top:'',height:'',maxHeight:keyboardOpen?`${(viewport?.height??window.innerHeight)*.92}px`:'',marginBottom:keyboardOpen?`${Math.max(0,node.clientHeight-(viewport?.offsetTop??0)-(viewport?.height??window.innerHeight))}px`:''});
        if(content.current)content.current.style.maxHeight='';
        if(!keyboardOpen){layoutHeight=node.clientHeight;panelHeight=panel.offsetHeight;}
      }
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(keepFocusVisible);
    };
    resize();
    viewport?.addEventListener('resize',resize);
    viewport?.addEventListener('scroll',resize);
    window.addEventListener('resize',resize);
    panel.addEventListener('focusin',resize);
    panel.focus({preventScroll:true});
    const onKey=(e:KeyboardEvent)=>{
      if(!top())return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();return;}
      if(e.key!=='Tab')return;
      const elements=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(el=>el.getClientRects().length&&!el.closest('[inert]'));
      const first=elements[0],last=elements.at(-1);
      if(!first){e.preventDefault();panel.focus();return;}
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel)){e.preventDefault();first.focus();}
    };
    window.addEventListener('keydown',onKey);
    return ()=>{
      unlock();
      cancelAnimationFrame(frame);
      panel.removeEventListener('focusin',resize);
      window.removeEventListener('keydown',onKey);
      viewport?.removeEventListener('resize',resize);
      viewport?.removeEventListener('scroll',resize);
      window.removeEventListener('resize',resize);
      if(trigger?.isConnected)trigger.focus({preventScroll:true});
    };
  },[stableHeight]);
  return <motion.div ref={root} data-app-sheet inert={!present} initial="closed" animate="open" exit="closed" className="fixed inset-0 z-50 flex items-end justify-center" transition={{duration:.26,ease:[.22,1,.36,1]}}>
    <motion.div variants={{closed:{opacity:0},open:{opacity:1}}} className="absolute inset-0 touch-none bg-black/65 backdrop-blur-sm" onClick={onClose}/>
    <motion.div variants={{closed:{y:"100%",transition:{duration:.36,ease:[.4,0,1,1]}},open:{y:0,transition:{duration:.4,ease:[.22,1,.36,1]}}}} drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:1}} dragTransition={{bounceStiffness:380,bounceDamping:34}} onDragEnd={(_,info)=>{if(info.offset.y>=(dialog.current?.offsetHeight??Infinity)*.25)onClose();}} ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title?titleId:undefined} aria-label={title?undefined:t('Details')} tabIndex={-1}
      className={`sheet-panel relative flex max-h-[92%] w-full max-w-lg flex-col rounded-t-[28px] outline-none ${stableHeight?'h-[92%]':''}`}>
      <div data-sheet-drag-handle onPointerDown={e=>dragControls.start(e)} className="flex h-7 shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing"><div className="h-1.5 w-10 rounded-full bg-line"/></div>
      <div onPointerDown={e=>{if(!(e.target as HTMLElement).closest('button,input,textarea,a,select'))dragControls.start(e);}} className="flex shrink-0 touch-none items-center justify-between gap-3 px-5 pt-1 pb-2">
        <div id={titleId} className="min-w-0 text-lg font-bold">{title}</div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-label={t('Close')}><X size={18}/></button>
      </div>
      {/* Keep the home-indicator inset inside the scrollport, so it does not
          become a fixed blank strip clipping content above the screen edge. */}
      <div ref={content} data-sheet-scroll data-motion className={`min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] ${stableHeight?'flex-1':''}`}>{children}</div>
    </motion.div>
  </motion.div>;
}
