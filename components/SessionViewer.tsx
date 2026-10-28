'use client';
import {createContext,useContext,useRef,type RefObject} from 'react';
import type {SessionFormValues} from './SessionForm';
const Viewer=createContext({meId:'',isHer:false});
type Draft={sessionId:string;version:string;values:SessionFormValues}|null;
const Editor=createContext<RefObject<Draft>|null>(null);
export const useSessionViewer=()=>useContext(Viewer);
export const useSessionDraft=()=>useContext(Editor);
export function SessionViewer({meId,isHer,children}:{meId:string;isHer:boolean;children:React.ReactNode}){
 const draft=useRef<Draft>(null);
 return <Viewer.Provider value={{meId,isHer}}><Editor.Provider value={draft}>{children}</Editor.Provider></Viewer.Provider>;
}
