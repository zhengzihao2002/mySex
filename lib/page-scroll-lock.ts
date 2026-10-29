'use client';

// Sheets and save overlays must share ownership. Independent overflow snapshots
// can otherwise restore another overlay's temporary lock after it has closed.
const owners=new Set<symbol>();
type Snapshot={overflow:string;position:string;top:string;width:string;rootOverflow:string;x:number;y:number};
let original:Snapshot|null=null;
let stopRecovery=()=>{};

function restoreViewport(x:number,y:number){
  let frame=0;
  const restore=()=>{
    if(owners.size)return;
    const active=document.activeElement;
    if(active instanceof HTMLElement&&active.matches('input,textarea,select,[contenteditable="true"]'))return;
    window.scrollTo(x,y);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(restore);};
  const viewport=window.visualViewport;
  const cancel=()=>{
    cancelAnimationFrame(frame);clearTimeout(timeout);
    viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
    for(const event of ['pointerdown','touchstart','wheel','keydown'])window.removeEventListener(event,cancel,true);
  };
  const timeout=setTimeout(cancel,500);
  viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
  window.addEventListener('resize',schedule);
  for(const event of ['pointerdown','touchstart','wheel','keydown'])window.addEventListener(event,cancel,{capture:true,passive:true});
  stopRecovery=cancel;
  // Safari can finish panning the document after the keyboard/modal has gone.
  // Restore again as it settles, stopping immediately on the next user action.
  restore();schedule();
}

export function lockPageScroll(){
  stopRecovery();
  if(!owners.size){
    const body=document.body.style,root=document.documentElement.style;
    original={overflow:body.overflow,position:body.position,top:body.top,width:body.width,rootOverflow:root.overflow,x:window.scrollX,y:window.scrollY};
    root.overflow='hidden';
    Object.assign(body,{overflow:'hidden',position:'fixed',top:`${-original.y}px`,width:'100%'});
  }
  const owner=Symbol();owners.add(owner);
  return ()=>{
    if(!owners.delete(owner)||owners.size||!original)return;
    const saved=original;original=null;
    Object.assign(document.body.style,{overflow:saved.overflow,position:saved.position,top:saved.top,width:saved.width});
    document.documentElement.style.overflow=saved.rootOverflow;
    restoreViewport(saved.x,saved.y);
  };
}
