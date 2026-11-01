'use client';

import {createContext,useCallback,useContext,useId,useLayoutEffect,useMemo,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,MotionConfig,useIsPresent} from 'motion/react';

type Entry={owner:string;content:ReactNode};
type Controller={show:(owner:string,content:ReactNode)=>void;hide:(owner:string)=>void};
const RecordingPresentation=createContext<Controller|null>(null);

/** Keeps the portal alive through route changes so minimizing can finish its exit. */
export function RecordingLayerProvider({children}:{children:ReactNode}) {
  const [entry,setEntry]=useState<Entry|null>(null);
  const [mounted,setMounted]=useState(false);
  useLayoutEffect(()=>setMounted(true),[]);
  const show=useCallback((owner:string,content:ReactNode)=>setEntry({owner,content}),[]);
  const hide=useCallback((owner:string)=>setEntry(current=>current?.owner===owner?null:current),[]);
  const controller=useMemo(()=>({show,hide}),[show,hide]);
  return <RecordingPresentation.Provider value={controller}>
    {children}
    {mounted&&createPortal(<MotionConfig reducedMotion="never"><AnimatePresence>{entry&&<RecordingPanel key="recording">{entry.content}</RecordingPanel>}</AnimatePresence></MotionConfig>,document.body)}
  </RecordingPresentation.Provider>;
}

function RecordingPanel({children}:{children:ReactNode}) {
  const present=useIsPresent();
  const [settled,setSettled]=useState(false);
  useLayoutEffect(()=>{if(present)setSettled(false);},[present]);
  return <motion.div className="recording-layer" data-state={!present?'exiting':settled?'open':'entering'} inert={!present}
    initial="hidden" animate="shown" exit="hidden"
    variants={{hidden:{y:'100%'},shown:{y:0}}}
    transition={{duration:.44,ease:[.22,1,.36,1]}}
    onAnimationComplete={definition=>{if(definition==='shown')setSettled(true);}}>
    {children}
  </motion.div>;
}

/** Registers live content without tying the portal's lifetime to the timer route. */
export function RecordingLayer({children}:{children:ReactNode}) {
  const controller=useContext(RecordingPresentation);
  const owner=useId();
  if(!controller)throw new Error('RecordingLayer requires RecordingLayerProvider');
  useLayoutEffect(()=>{controller.show(owner,children);},[controller,owner,children]);
  useLayoutEffect(()=>()=>controller.hide(owner),[controller,owner]);
  return null;
}
