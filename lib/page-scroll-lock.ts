'use client';

// Sheets and save overlays must share ownership. Independent overflow snapshots
// can otherwise restore another overlay's temporary lock after it has closed.
const owners=new Set<symbol>();
type Snapshot={overflow:string;x:number;y:number};
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
    const body=document.body.style;
    original={overflow:body.overflow,x:window.scrollX,y:window.scrollY};
    // Changing body positioning or root overflow can shrink the standalone
    // iOS viewport before any keyboard is shown. Keep the document geometry.
    body.overflow='hidden';
  }
  const owner=Symbol();owners.add(owner);
  return ()=>{
    if(!owners.delete(owner)||owners.size||!original)return;
    const saved=original;original=null;
    document.body.style.overflow=saved.overflow;
    restoreViewport(saved.x,saved.y);
  };
}
