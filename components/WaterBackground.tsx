'use client';
import {useLayoutEffect,useRef} from 'react';
import {attachFluidWater} from '@/lib/fluid-water';

export function WaterBackground({contained=false}:{contained?:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{if(host.current)return attachFluidWater(host.current,contained);},[contained]);
  return <div ref={host} aria-hidden="true" className={`water-background${contained?' water-background--contained':''}`}>
    <div className="water-fallback"/>
  </div>;
}
