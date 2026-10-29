'use client';
import {createContext,useContext,useEffect,useRef,type RefObject} from 'react';
import type {SessionFormValues} from './SessionForm';
const Viewer=createContext({meId:'',isHer:false});
type Draft={sessionId:string;version:string;values:SessionFormValues}|null;
const Editor=createContext<RefObject<Draft>|null>(null);
export const useSessionViewer=()=>useContext(Viewer);
export const useSessionDraft=()=>useContext(Editor);
export function SessionViewer({meId,isHer,children}:{meId:string;isHer:boolean;children:React.ReactNode}){
 const draft=useRef<Draft>(null);
 useEffect(()=>{
   // The device passcode feature has been retired; discard its old local hash.
   try{localStorage.removeItem('mysex.pin');}catch{}
 },[]);
 return <Viewer.Provider value={{meId,isHer}}><Editor.Provider value={draft}>{children}</Editor.Provider></Viewer.Provider>;
}
