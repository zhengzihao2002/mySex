'use client';
import {createContext,useContext} from 'react';
const Viewer=createContext({meId:'',isHer:false});
export const useSessionViewer=()=>useContext(Viewer);
export function SessionViewer({meId,isHer,children}:{meId:string;isHer:boolean;children:React.ReactNode}){
 return <Viewer.Provider value={{meId,isHer}}>{children}</Viewer.Provider>;
}
