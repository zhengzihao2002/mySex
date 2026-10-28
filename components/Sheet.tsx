'use client';

import {useEffect,useLayoutEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useT} from './I18nProvider';

// Only populated by client effects; nested sheets share one body scroll lock.
const locks=new Set<HTMLElement>();
let previousOverflow='';

export function Sheet({open,onClose,title,children,viewKey}:{open:boolean;onClose:()=>void;title?:React.ReactNode;children:React.ReactNode;viewKey?:string}) {
  const {t}=useT();
  const titleId=useId();
  const content=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{if(open&&content.current)content.current.scrollTop=0;},[open,viewKey]);
  const root=useRef<HTMLDivElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;},[onClose]);
  useEffect(()=>{
    if(!open||!root.current||!dialog.current)return;
    const node=root.current;
    const panel=dialog.current;
    const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(!locks.size){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
    locks.add(node);
    const top=()=>Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)===node;
    const viewport=window.visualViewport;
    const resize=()=>{
      node.style.top=`${viewport?.offsetTop??0}px`;
      node.style.height=`${viewport?.height??window.innerHeight}px`;
    };
    resize();
    viewport?.addEventListener('resize',resize);
    viewport?.addEventListener('scroll',resize);
    window.addEventListener('resize',resize);
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
      locks.delete(node);
      if(!locks.size)document.body.style.overflow=previousOverflow;
      window.removeEventListener('keydown',onKey);
      viewport?.removeEventListener('resize',resize);
      viewport?.removeEventListener('scroll',resize);
      window.removeEventListener('resize',resize);
      if(trigger?.isConnected)trigger.focus({preventScroll:true});
    };
  },[open]);
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div ref={root} data-app-sheet className="fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center">
    <div className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm motion-reduce:animate-none" onClick={onClose}/>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title?titleId:undefined} aria-label={title?undefined:t('Details')} tabIndex={-1}
      className="relative flex max-h-[92%] w-full max-w-lg animate-rise flex-col rounded-t-[32px] border-t border-line bg-surface pb-safe shadow-2xl outline-none motion-reduce:animate-none">
      <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line"/>
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-2">
        <div id={titleId} className="min-w-0 text-lg font-bold">{title}</div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-label={t('Close')}><X size={18}/></button>
      </div>
      <div ref={content} className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
    </div>
  </div>,document.body);
}
