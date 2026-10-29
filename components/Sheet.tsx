'use client';

import {useEffect,useLayoutEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useT} from './I18nProvider';
import {lockPageScroll} from '@/lib/page-scroll-lock';

export function Sheet({open,onClose,title,children,viewKey,stableHeight=false}:{open:boolean;onClose:()=>void;title?:React.ReactNode;children:React.ReactNode;viewKey?:string;stableHeight?:boolean}) {
  const {t}=useT();
  const titleId=useId();
  const content=useRef<HTMLDivElement>(null);
  const root=useRef<HTMLDivElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const previousView=useRef(viewKey);
  useLayoutEffect(()=>{
    if(open&&content.current){
      content.current.scrollTop=0;
      if(previousView.current!==viewKey)dialog.current?.focus({preventScroll:true});
    }
    previousView.current=viewKey;
  },[open,viewKey]);
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;},[onClose]);
  useLayoutEffect(()=>{
    if(!open||!root.current||!dialog.current)return;
    const node=root.current;
    const panel=dialog.current;
    const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const unlock=lockPageScroll();
    const top=()=>Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)===node;
    const viewport=window.visualViewport;
    // Session forms keep their panel height when the keyboard opens. Only the
    // inner scroll area follows the visible space; its background stays solid
    // behind the keyboard rather than exposing the page underneath.
    let layoutWidth=document.documentElement.clientWidth;
    let layoutHeight=window.innerHeight;
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
      if(stableHeight){
        const width=document.documentElement.clientWidth;
        if(width!==layoutWidth){layoutWidth=width;layoutHeight=window.innerHeight;}
        const active=document.activeElement;
        const typing=active instanceof HTMLElement&&panel.contains(active)&&active.matches('input,textarea,select,[contenteditable="true"]');
        // Safari can report a slightly shorter visual viewport even without a
        // keyboard. Do not turn that safe-area/browser inset into a bottom gap.
        const keyboardOpen=typing&&layoutHeight-(viewport?.height??window.innerHeight)>120;
        // Counter Safari's visual-viewport panning without moving the header
        // above the screen. Keyboard resize never changes the panel height.
        node.style.top=`${keyboardOpen?(viewport?.offsetTop??0):0}px`;
        node.style.height=`${layoutHeight}px`;
        if(content.current&&keyboardOpen){
          const visibleBottom=(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight);
          // Layout offsets exclude the opening animation's translateY.
          const contentTop=(viewport?.offsetTop??0)+panel.offsetTop+content.current.offsetTop;
          content.current.style.maxHeight=`${Math.max(0,visibleBottom-contentTop-12)}px`;
        }else if(content.current)content.current.style.maxHeight='';
      }else{
        node.style.top=`${viewport?.offsetTop??0}px`;
        node.style.height=`${viewport?.height??window.innerHeight}px`;
        if(content.current)content.current.style.maxHeight='';
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
  },[open,stableHeight]);
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div ref={root} data-app-sheet className="fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center">
    <div className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm motion-reduce:animate-none" onClick={onClose}/>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title?titleId:undefined} aria-label={title?undefined:t('Details')} tabIndex={-1}
      className={`relative flex max-h-[92%] w-full max-w-lg animate-rise flex-col rounded-t-[32px] border-t border-line bg-surface pb-safe shadow-2xl outline-none motion-reduce:animate-none ${stableHeight?'h-[92%]':''}`}>
      <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line"/>
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-2">
        <div id={titleId} className="min-w-0 text-lg font-bold">{title}</div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-label={t('Close')}><X size={18}/></button>
      </div>
      <div ref={content} data-sheet-scroll className={`min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 ${stableHeight?'flex-1':''}`}>{children}</div>
    </div>
  </div>,document.body);
}
