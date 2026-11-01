'use client';

import {useLayoutEffect,useRef,useState} from 'react';

/** Detect a visible lap in render, so the completed arc survives the wrap frame. */
export function useRingCompletion(seconds:number,period:number,reduced:boolean) {
  const lap=Math.floor(seconds/period);
  const previous=useRef(seconds);
  const [state,setState]=useState<{lap:number;completed:number|null}>(()=>({lap,completed:null}));
  if(lap!==state.lap||(reduced&&state.completed!==null)){
    const visibleLap=!reduced&&lap===state.lap+1&&seconds>=previous.current&&seconds-previous.current<1;
    setState({lap,completed:visibleLap?lap:null});
  }
  useLayoutEffect(()=>{previous.current=seconds;},[seconds]);
  const complete=(completed:number)=>setState(current=>current.completed===completed?{...current,completed:null}:current);
  return {completed:reduced?null:state.completed,complete};
}
