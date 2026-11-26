'use client';

import {useEffect,useLayoutEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,MotionConfig,useIsPresent,useDragControls} from 'motion/react';
import {X} from 'lucide-react';
import {OVERLAY_TRANSITION} from '@/lib/overlay-motion';
import {useT} from './I18nProvider';
import {lockPageScroll} from '@/lib/page-scroll-lock';
import {KEYBOARD_EVENT,TEXT_ENTRY,keyboardHeight} from './KeyboardFloat';

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
  // Sheets with text fields open at full height, so focusing a field never
  // has to grow or move the panel.
  const [typingSheet,setTypingSheet]=useState(false);
  useLayoutEffect(()=>{
    const area=content.current;if(!area)return;
    const check=()=>setTypingSheet(!!area.querySelector(TEXT_ENTRY));
    check();
    const observer=new MutationObserver(check);
    observer.observe(area,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  const tall=stableHeight||typingSheet;
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
    const unlock=lockPageScroll();
    const top=()=>Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)===node;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The keyboard floats over the sheet (see KeyboardFloat). The panel never
    // moves or resizes: it only gains scroll room underneath, and the focused
    // field glides into view as the keyboard rises. Content stays painted
    // behind the translucent keyboard instead of being clipped.
    let room=0,release=0;
    const field=()=>{const active=document.activeElement;return active instanceof HTMLElement&&panel.contains(active)&&active.matches(TEXT_ENTRY)?active:null;};
    const setRoom=(height:number)=>{
      const area=content.current;if(!area)return;
      clearTimeout(release);
      if(!panel.style.height)panel.style.height=`${panel.offsetHeight}px`;
      room=height;
      area.style.paddingBottom=`calc(env(safe-area-inset-bottom) + 24px + ${height}px)`;
    };
    const reveal=(height:number)=>{
      const area=content.current,target=field();
      if(!area||!target||!top())return;
      const box=area.getBoundingClientRect(),rect=target.getBoundingClientRect();
      const visibleBottom=Math.min(box.bottom,node.clientHeight-height)-20;
      let delta=0;
      if(rect.bottom>visibleBottom)delta=Math.min(rect.bottom-visibleBottom,rect.top-box.top-20);
      else if(rect.top<box.top+20)delta=rect.top-box.top-20;
      if(Math.abs(delta)>1)area.scrollTo({top:area.scrollTop+delta,behavior:reducedMotion?'auto':'smooth'});
    };
    const finish=()=>{
      // Glide back out of the extra room first, then remove it, so nothing jumps.
      const area=content.current;
      if(!area||!room)return;
      const limit=Math.max(0,area.scrollHeight-area.clientHeight-room);
      if(area.scrollTop>limit)area.scrollTo({top:limit,behavior:reducedMotion?'auto':'smooth'});
      clearTimeout(release);
      release=window.setTimeout(()=>{if(keyboardHeight()>0)return;area.style.paddingBottom='';room=0;panel.style.height='';},reducedMotion?0:420);
    };
    const onKeyboard=()=>{
      const height=keyboardHeight();
      if(height>0&&field()){setRoom(height);reveal(height);}
      else if(height===0)finish();
    };
    // Moving between fields with the keyboard already up.
    const onFocus=()=>{if(keyboardHeight()>0&&field())onKeyboard();};
    window.addEventListener(KEYBOARD_EVENT,onKeyboard);
    panel.addEventListener('focusin',onFocus);
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
      clearTimeout(release);
      window.removeEventListener(KEYBOARD_EVENT,onKeyboard);
      panel.removeEventListener('focusin',onFocus);
      window.removeEventListener('keydown',onKey);
      if(trigger?.isConnected)trigger.focus({preventScroll:true});
    };
  },[]);
  return <motion.div ref={root} data-app-sheet inert={!present} initial="closed" animate="open" exit="closed" className="fixed inset-0 z-50 flex items-end justify-center" transition={OVERLAY_TRANSITION}>
    <motion.div variants={{closed:{opacity:0},open:{opacity:1}}} transition={OVERLAY_TRANSITION} className="absolute inset-0 touch-none bg-black/65 backdrop-blur-sm" onClick={onClose}/>
    <motion.div variants={{closed:{y:"100%",transition:OVERLAY_TRANSITION},open:{y:0,transition:OVERLAY_TRANSITION}}} drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:1}} dragTransition={{bounceStiffness:380,bounceDamping:34}} onDragEnd={(_,info)=>{if(info.offset.y>=(dialog.current?.offsetHeight??Infinity)*.25)onClose();}} ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title?titleId:undefined} aria-label={title?undefined:t('Details')} tabIndex={-1}
      className={`sheet-panel relative flex max-h-[92%] w-full max-w-lg flex-col rounded-t-[28px] outline-none ${tall?'h-[92%]':''}`}>
      <div data-sheet-drag-handle onPointerDown={e=>dragControls.start(e)} className="flex h-7 shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing"><div className="h-1.5 w-10 rounded-full bg-line"/></div>
      <div onPointerDown={e=>{if(!(e.target as HTMLElement).closest('button,input,textarea,a,select'))dragControls.start(e);}} className="flex shrink-0 touch-none items-center justify-between gap-3 px-5 pt-1 pb-2">
        <div id={titleId} className="min-w-0 text-lg font-bold">{title}</div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-label={t('Close')}><X size={18}/></button>
      </div>
      {/* Keep the home-indicator inset inside the scrollport, so it does not
          become a fixed blank strip clipping content above the screen edge. */}
      <div ref={content} data-sheet-scroll data-motion className={`min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] ${tall?'flex-1':''}`}>{children}</div>
    </motion.div>
  </motion.div>;
}
