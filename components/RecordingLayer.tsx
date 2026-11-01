'use client';

import {createContext,useCallback,useContext,useId,useLayoutEffect,useMemo,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,MotionConfig,useIsPresent} from 'motion/react';

type Entrance='fade'|'slide';
type Dismissal='minimize'|'discard';
type Entry={owner:string;content:ReactNode;entrance:Entrance};
type Controller={show:(owner:string,content:ReactNode,entrance:Entrance)=>void;hide:(owner:string)=>void;setDismissal:(dismissal:Dismissal)=>void};
const RecordingPresentation=createContext<Controller|null>(null);

/** Keeps the portal alive through route changes so minimizing can finish its exit. */
export function RecordingLayerProvider({children}:{children:ReactNode}) {
  const [entry,setEntry]=useState<Entry|null>(null);
  const [mounted,setMounted]=useState(false);
  const [dismissal,setDismissal]=useState<Dismissal>('minimize');
  useLayoutEffect(()=>setMounted(true),[]);
  const show=useCallback((owner:string,content:ReactNode,entrance:Entrance)=>setEntry({owner,content,entrance}),[]);
  const hide=useCallback((owner:string)=>setEntry(current=>current?.owner===owner?null:current),[]);
  const controller=useMemo(()=>({show,hide,setDismissal}),[show,hide]);
  return <RecordingPresentation.Provider value={controller}>
    {children}
    {mounted&&createPortal(<MotionConfig reducedMotion="never"><AnimatePresence custom={dismissal}>{entry&&<RecordingPanel key="recording" entrance={entry.entrance}>{entry.content}</RecordingPanel>}</AnimatePresence></MotionConfig>,document.body)}
  </RecordingPresentation.Provider>;
}

function RecordingPanel({children,entrance}:{children:ReactNode;entrance:Entrance}) {
  const present=useIsPresent();
  const [settled,setSettled]=useState(false);
  useLayoutEffect(()=>{if(present)setSettled(false);},[present]);
  return <motion.div className="recording-layer" data-state={!present?'exiting':settled?'open':'entering'} inert={!present}
    initial={entrance==='fade'?'faded':'hidden'} animate="shown" exit="dismissed"
    variants={{faded:{y:0,opacity:0},hidden:{y:'100%',opacity:1},shown:{y:0,opacity:1,scale:1,filter:'blur(0px)'},dismissed:(dismissal:Dismissal)=>dismissal==='discard'?{y:-24,scale:.88,opacity:0,filter:'blur(5px)',transition:{duration:.38,ease:[.4,0,.2,1]}}:{y:'100%',scale:1,opacity:1,filter:'blur(0px)'}}}
    transition={{duration:.44,ease:[.22,1,.36,1]}}
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
