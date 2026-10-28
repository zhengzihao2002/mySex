'use client';

import {createContext,useCallback,useContext,useLayoutEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';

// Navigation preferences live only for this signed-in app lifetime, never in persistent storage.
const Memory=createContext<Map<string,unknown>|null>(null);
export function ViewMemory({children}:{children:React.ReactNode}) {
  const values=useRef(new Map<string,unknown>());
  return <Memory.Provider value={values.current}>{children}</Memory.Provider>;
}

export function useViewState<T>(key:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>] {
  const memory=useContext(Memory);
  const [value,setValue]=useState<T>(()=>memory?.has(key)?memory.get(key) as T:typeof initial==='function'?(initial as ()=>T)():initial);
  const current=useRef(value);
  const update=useCallback<Dispatch<SetStateAction<T>>>(next=>{
    const resolved=typeof next==='function'?(next as (previous:T)=>T)(current.current):next;
    current.current=resolved;
    memory?.set(key,resolved);
    setValue(resolved);
  },[key,memory]);
  return [value,update];
}

export function useViewScroll(key:string) {
  const memory=useContext(Memory);
  useLayoutEffect(()=>{
    if(!memory)return;
    const saved=Number(memory.get(`scroll:${key}`)??0);
    let position=saved;
    let ready=false;
    let second=0;
    const first=requestAnimationFrame(()=>{
      second=requestAnimationFrame(()=>{
        window.scrollTo({top:saved,behavior:'instant'});
        ready=true;
      });
    });
    const remember=()=>{if(ready)position=window.scrollY;};
    window.addEventListener('scroll',remember,{passive:true});
    return ()=>{
      memory.set(`scroll:${key}`,position);
      cancelAnimationFrame(first);cancelAnimationFrame(second);
      window.removeEventListener('scroll',remember);
    };
  },[key,memory]);
}
