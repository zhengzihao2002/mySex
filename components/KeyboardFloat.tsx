'use client';

import {useEffect} from 'react';

/**
 * Makes the on-screen keyboard float over the app, like a native overlay.
 *
 * iOS Safari normally pans the whole page to reveal a focused field, which
 * looks like the screen shrinking and the dialog being dragged. WebKit skips
 * that reveal for a field that is transparent at the moment it gains focus, so
 * a tapped field is made transparent for at most one frame around focus. The
 * app then reveals the field itself: sheets scroll their content, Notes lifts
 * its composer and ordinary pages scroll smoothly. Any pan that still happens
 * on a scroll-locked screen is undone at once.
 *
 * Publishes `--keyboard-inset` (follows the keyboard) and `--keyboard-room`
 * (scroll room, removed after the page has glided back) on <html>, plus
 * `data-keyboard="open"` and a `mysex:keyboard` event with the height.
 */
export const TEXT_ENTRY='input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([type=color]),textarea,[contenteditable="true"]';
export const KEYBOARD_EVENT='mysex:keyboard';
const STORE='mysex-keyboard-height';

let height=0;
export const keyboardHeight=()=>height;

export function KeyboardFloat(){
  useEffect(()=>{
    if(!window.matchMedia('(pointer: coarse)').matches)return;
    const root=document.documentElement;
    const viewport=window.visualViewport;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The layout viewport (initial containing block) keeps its size while the
    // keyboard is up, unlike the visual viewport.
    const layoutHeight=()=>root.clientHeight;
    const remembered=()=>{try{const saved=JSON.parse(localStorage.getItem(STORE)??'{}');return Number(saved[String(window.innerWidth)])||0;}catch{return 0;}};
    const remember=(value:number)=>{try{const saved=JSON.parse(localStorage.getItem(STORE)??'{}');saved[String(window.innerWidth)]=value;localStorage.setItem(STORE,JSON.stringify(saved));}catch{}};
    const field=()=>{const active=document.activeElement;return active instanceof HTMLElement&&active.matches(TEXT_ENTRY)?active:null;};
    const locked=()=>document.body.style.overflow==='hidden';
    let measured=false,roomTimer=0,blurTimer=0,focusAt=0,hold:{x:number;y:number}|null=null;

    const publish=(value:number)=>{
      if(Math.abs(value-height)<2&&root.dataset.keyboard===(value>0?'open':'closed'))return;
      height=value;
      root.style.setProperty('--keyboard-inset',`${value}px`);
      root.dataset.keyboard=value>0?'open':'closed';
      clearTimeout(roomTimer);
      if(value>0)root.style.setProperty('--keyboard-room',`${value}px`);
      // Keep the scroll room until the page has glided back, so nothing jumps.
      else roomTimer=window.setTimeout(()=>root.style.setProperty('--keyboard-room','0px'),reduced?0:420);
      if(value>0)revealOnPage(value);
      else if(!locked()){
        const limit=Math.max(0,root.scrollHeight-(parseFloat(getComputedStyle(root).getPropertyValue('--keyboard-room'))||0)-layoutHeight());
        if(window.scrollY>limit)window.scrollTo({top:limit,behavior:reduced?'auto':'smooth'});
      }
      window.dispatchEvent(new CustomEvent(KEYBOARD_EVENT,{detail:value}));
    };
    // Fields on ordinary pages scroll the document; sheets and Notes reveal their own.
    const revealOnPage=(value:number)=>{
      const target=field();
      if(!target||locked()||target.closest('[data-app-sheet],.notes-page'))return;
      const rect=target.getBoundingClientRect(),bottom=layoutHeight()-value-24;
      if(rect.bottom>bottom)window.scrollBy({top:Math.min(rect.bottom-bottom,rect.top-80),behavior:reduced?'auto':'smooth'});
    };

    // 1. Suppress Safari's own reveal: transparent for the instant of focus.
    let start:{x:number;y:number}|null=null;
    const onTouchStart=(e:TouchEvent)=>{const touch=e.touches[0];start=touch?{x:touch.clientX,y:touch.clientY}:null;};
    const onTouchEnd=(e:TouchEvent)=>{
      const touch=e.changedTouches[0];
      if(!start||!touch||Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>10)return;
      const element=e.target instanceof Element?e.target:null;
      const label=element?.closest('label');
      const target=(element?.closest(TEXT_ENTRY)??(label?.control?.matches(TEXT_ENTRY)?label.control:null)) as HTMLElement|null;
      if(!target||target===document.activeElement||(target as HTMLInputElement).disabled||(target as HTMLInputElement).readOnly)return;
      const previous=target.style.opacity;
      target.style.opacity='0';
      let restored=false;
      const restore=()=>{if(restored)return;restored=true;target.style.opacity=previous;target.removeEventListener('focus',onFocused);};
      const onFocused=()=>requestAnimationFrame(restore);
      target.addEventListener('focus',onFocused);
      // Never leave a field hidden if focus does not follow the tap.
      setTimeout(restore,120);
    };

    // 2. Track the keyboard. Start moving with the predicted height so the app
    //    rises together with the keyboard, then settle on the measured one.
    const onFocusIn=()=>{
      if(!field())return;
      clearTimeout(blurTimer);
      if(locked())hold={x:window.scrollX,y:window.scrollY};
      if(height===0){measured=false;publish(remembered()||Math.round(layoutHeight()*.4));}
    };
    const onFocusOut=()=>{
      clearTimeout(blurTimer);
      // Focus may be moving to another field; only close when none follows.
      blurTimer=window.setTimeout(()=>{if(!field()){hold=null;measured=false;publish(0);}},60);
    };
    const onViewport=()=>{
      const visible=viewport?.height??window.innerHeight;
      const gap=layoutHeight()-visible;
      const open=!!field()&&gap>120;
      // 3. If Safari pans a scroll-locked screen anyway, put it straight back.
      if(open&&hold&&locked()&&((viewport?.offsetTop??0)>0||window.scrollY!==hold.y))window.scrollTo(hold.x,hold.y);
      if(open){measured=true;if(Math.abs(gap-height)>=2)remember(gap);publish(gap);}
      else if(measured&&gap<60){measured=false;publish(0);}
    };
    // A hardware keyboard never shows one on screen.
    const fallback=window.setInterval(()=>{if(height>0&&!measured&&field()&&layoutHeight()-(viewport?.height??window.innerHeight)<60&&performance.now()-focusAt>900)publish(0);},300);
    const stamp=()=>{focusAt=performance.now();};

    document.addEventListener('touchstart',onTouchStart,{capture:true,passive:true});
    document.addEventListener('touchend',onTouchEnd,{capture:true,passive:true});
    document.addEventListener('focusin',stamp,true);
    document.addEventListener('focusin',onFocusIn);
    document.addEventListener('focusout',onFocusOut);
    viewport?.addEventListener('resize',onViewport);
    viewport?.addEventListener('scroll',onViewport);
    window.addEventListener('scroll',onViewport,{passive:true});
    return()=>{
      clearTimeout(roomTimer);clearTimeout(blurTimer);clearInterval(fallback);
      document.removeEventListener('touchstart',onTouchStart,true);
      document.removeEventListener('touchend',onTouchEnd,true);
      document.removeEventListener('focusin',stamp,true);
      document.removeEventListener('focusin',onFocusIn);
      document.removeEventListener('focusout',onFocusOut);
      viewport?.removeEventListener('resize',onViewport);
      viewport?.removeEventListener('scroll',onViewport);
      window.removeEventListener('scroll',onViewport);
    };
  },[]);
  return null;
}
