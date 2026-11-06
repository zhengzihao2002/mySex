'use client';

import {createContext,useCallback,useContext,useId,useLayoutEffect,useMemo,useState,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {OVERLAY_TRANSITION} from '@/lib/overlay-motion';
import {AnimatePresence,motion,MotionConfig,useIsPresent} from 'motion/react';

type Entrance='none'|'fade'|'slide';
type Dismissal='minimize'|'discard';
type Entry={owner:string;content:ReactNode;entrance:Entrance};
type Controller={show:(owner:string,content:ReactNode,entrance:Entrance)=>void;hide:(owner:string)=>void;setDismissal:(dismissal:Dismissal)=>void};
const RecordingPresentation=createContext<Controller|null>(null);

/** Keeps the portal alive through route changes so minimizing can finish its exit. */
export function RecordingLayerProvider({children}:{children:ReactNode}) {
  const path=usePathname();
  const initialPath=useRef(path);
  const firstOwner=useRef<string|null>(null);
  const navigated=useRef(false);
  useLayoutEffect(()=>{if(path!==initialPath.current)navigated.current=true;},[path]);
  const [entry,setEntry]=useState<Entry|null>(null);
  const [mounted,setMounted]=useState(false);
  const [dismissal,setDismissal]=useState<Dismissal>('minimize');
  useLayoutEffect(()=>setMounted(true),[]);
  const show=useCallback((owner:string,content:ReactNode,entrance:Entrance)=>{
    if(firstOwner.current===null)firstOwner.current=owner;
    const restored=firstOwner.current===owner&&!navigated.current&&initialPath.current==='/timer'&&entrance==='slide';
    setEntry(current=>({owner,content,entrance:current?.owner===owner?current.entrance:restored?'none':entrance}));
  },[]);
  const hide=useCallback((owner:string)=>setEntry(current=>current?.owner===owner?null:current),[]);
  const controller=useMemo(()=>({show,hide,setDismissal}),[show,hide]);
  return <RecordingPresentation.Provider value={controller}>
    {children}
    {mounted&&createPortal(<MotionConfig reducedMotion="never"><AnimatePresence custom={dismissal}>{entry&&<RecordingPanel key="recording" entrance={entry.entrance}>{entry.content}</RecordingPanel>}</AnimatePresence></MotionConfig>,document.body)}
  </RecordingPresentation.Provider>;
}

function RecordingPanel({children,entrance}:{children:ReactNode;entrance:Entrance}) {
  const present=useIsPresent();
  const [settled,setSettled]=useState(entrance==='none');
  const panel=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const node=panel.current;if(!node)return;
    const viewport=window.visualViewport;
    const properties=['--recording-top','--recording-left','--recording-height','--recording-width'];
    const previous=properties.map(name=>document.body.style.getPropertyValue(name));
    const fit=()=>{
      // Safari can pan its visual viewport during standalone reload/restoration.
      // Anchor this overlay to the visible rectangle, not stale fixed insets.
      const active=document.activeElement;
      if(active instanceof HTMLElement&&active.matches('input,textarea,select,[contenteditable="true"]'))return;
      node.style.top=`${viewport?.offsetTop??0}px`;
      node.style.left=`${viewport?.offsetLeft??0}px`;
      node.style.height=`${viewport?.height??window.innerHeight}px`;
      node.style.width=`${viewport?.width??window.innerWidth}px`;
      [node.style.top,node.style.left,node.style.height,node.style.width].forEach((value,i)=>document.body.style.setProperty(properties[i],value));
    };
    fit();
    viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);
    window.addEventListener('resize',fit);window.addEventListener('pageshow',fit);
    return()=>{properties.forEach((name,i)=>{if(previous[i])document.body.style.setProperty(name,previous[i]);else document.body.style.removeProperty(name);});viewport?.removeEventListener('resize',fit);viewport?.removeEventListener('scroll',fit);window.removeEventListener('resize',fit);window.removeEventListener('pageshow',fit);};
  },[]);
  useLayoutEffect(()=>{if(present)setSettled(entrance==='none');},[present,entrance]);
  return <motion.div ref={panel} className="recording-layer" data-state={!present?'exiting':settled?'open':'entering'} inert={!present}
    initial={entrance==='none'?false:entrance==='fade'?'faded':'hidden'} animate="shown" exit="dismissed"
    variants={{faded:{y:0,opacity:0},hidden:{y:'100%',opacity:1},shown:{y:0,opacity:1,scale:1,filter:'none'},dismissed:(dismissal:Dismissal)=>dismissal==='discard'?{y:-24,scale:.88,opacity:0,filter:'blur(5px)',transition:OVERLAY_TRANSITION}:{y:'100%',scale:1,opacity:1,filter:'none'}}}
    transition={OVERLAY_TRANSITION}
    onAnimationComplete={definition=>{if(definition==='shown')setSettled(true);}}>
    {children}
  </motion.div>;
}

/** Registers live content without tying the portal's lifetime to the timer route. */
export function RecordingLayer({children,entrance='slide'}:{children:ReactNode;entrance?:Entrance}) {
  const controller=useContext(RecordingPresentation);
  const owner=useId();
  if(!controller)throw new Error('RecordingLayer requires RecordingLayerProvider');
  useLayoutEffect(()=>{controller.show(owner,children,entrance);},[controller,owner,children,entrance]);
  useLayoutEffect(()=>{controller.setDismissal('minimize');return()=>controller.hide(owner);},[controller,owner]);
  return null;
}

/** Set the exit intent before a server action can remove the active session. */
export function useRecordingDismissal() {
  const controller=useContext(RecordingPresentation);
  if(!controller)throw new Error('useRecordingDismissal requires RecordingLayerProvider');
  return controller.setDismissal;
}
