'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import autoAnimate from '@/lib/vendor/auto-animate/index.mjs';

export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const controllers = new Map<Element, ReturnType<typeof autoAnimate>>();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const discover = () => {
      for (const [node, controller] of controllers) {
        if (!node.isConnected) { controller.destroy?.(); controllers.delete(node); }
      }
      if (preference.matches) return;
      document.querySelectorAll<HTMLElement>('[data-motion]').forEach(node => {
        if (!controllers.has(node)) controllers.set(node, autoAnimate(node, { duration: 260, easing: 'ease-out' }));
      });
    };
    const updatePreference = () => {
      controllers.forEach(controller => controller.destroy?.());
      controllers.clear();
      discover();
    };
    discover();
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; discover(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    preference.addEventListener('change', updatePreference);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); preference.removeEventListener('change', updatePreference); controllers.forEach(controller => controller.destroy?.()); };
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const previous=useRef(path);
  const order=['/home','/calendar','/timer','/insights','/notes'];
  const direction=order.indexOf(path)>=order.indexOf(previous.current)?1:-1;
  useLayoutEffect(()=>{previous.current=path;},[path]);
  return <motion.main key={path} className="app-frame" initial={path === '/timer' || (previous.current === '/timer' && path === '/home') ? false : { opacity: 0, x: direction*22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .32, ease: [.22, 1, .36, 1] }}>{children}</motion.main>;
}

export function AnimatedContent({ value, children }: { value: string; children: ReactNode }) {
  return <AnimatePresence mode="wait" initial={false}><motion.div key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .16 }} data-motion>{children}</motion.div></AnimatePresence>;
}

export function SelectionPill({ id }: { id: string }) {
  return <motion.span layoutId={id} className="selection-pill" transition={{ type: 'spring', stiffness: 420, damping: 35 }} />;
}

export function AnimatedValue({ value }: { value: string | number }) {
  return <span className="relative inline-grid align-baseline">
    <span className="sr-only">{value}</span>
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span key={String(value)} aria-hidden="true" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .16 }}>{value}</motion.span>
    </AnimatePresence>
  </span>;
}
