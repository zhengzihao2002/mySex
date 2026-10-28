'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const DURATION = 260;
const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/** Three mounted months keep dragging immediate, including the incoming month's contents. */
export function MonthPager({ pages, onChange }: { pages: [ReactNode, ReactNode, ReactNode]; onChange: (delta: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const gesture = useRef<{ id: number; x: number; y: number; axis: 'pending' | 'x' | 'y'; source: 'touch' | 'pointer' } | null>(null);
  const suppressClick = useRef(false);
  const blocked = useRef(false);
  const destination = useRef(0);
  const finishing = useRef(false);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [size, setSize] = useState({ width: 0, heights: [0, 0, 0] });

  useLayoutEffect(() => {
    const measure = () => {
      const width = viewport.current?.clientWidth ?? 0;
      const heights = panels.current.map(panel => panel?.offsetHeight ?? 0);
      setSize(old => old.width === width && old.heights.every((h, i) => h === heights[i]) ? old : { width, heights });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    panels.current.forEach(panel => { if (panel) observer.observe(panel); });
    return () => observer.disconnect();
  }, []);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    blocked.current = false;
    setSettling(false);
    setOffset(0);
    if (destination.current) onChange(destination.current);
  }, [onChange]);

  useEffect(() => {
    if (!settling) return;
    // A fallback also completes when the browser suppresses transitionend (for example, in a background tab).
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DURATION + 50;
    const timer = window.setTimeout(finish, delay);
    return () => window.clearTimeout(timer);
  }, [settling, finish]);

  const settle = useCallback((delta: number) => {
    gesture.current = null;
    blocked.current = true;
    destination.current = delta;
    finishing.current = false;
    setSettling(true);
    setOffset(-delta * (viewport.current?.clientWidth ?? 0));
  }, []);
  const begin = useCallback((id: number, x: number, y: number, source: 'touch' | 'pointer') => {
    if (blocked.current || gesture.current) return;
    suppressClick.current = false;
    gesture.current = { id, x, y, source, axis: 'pending' };
  }, []);
  const drag = useCallback((x: number, y: number) => {
    const start = gesture.current;
    if (!start) return false;
    const dx = x - start.x;
    const dy = y - start.y;
    if (start.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (start.axis !== 'x') return false;
    suppressClick.current = true;
    const width = viewport.current?.clientWidth ?? 0;
    setOffset(Math.max(-width, Math.min(width, dx)));
    return true;
  }, []);
  const release = useCallback((x: number) => {
    const start = gesture.current;
    if (!start) return;
    if (start.axis === 'x') {
      const dx = x - start.x;
      settle(Math.abs(dx) >= (viewport.current?.clientWidth ?? 0) / 2 ? (dx < 0 ? 1 : -1) : 0);
    } else gesture.current = null;
  }, [settle]);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    // Touch events keep the same target throughout a swipe, even when that day moves
    // out from under the finger or Safari changes pointer capture.
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) { if (gesture.current?.source === 'touch') settle(0); return; }
      const touch = e.touches[0];
      begin(touch.identifier, touch.clientX, touch.clientY, 'touch');
    };
    const move = (e: TouchEvent) => {
      const active = gesture.current;
      if (active?.source !== 'touch') return;
      const touch = Array.from(e.touches).find(t => t.identifier === active.id);
      if (touch && drag(touch.clientX, touch.clientY) && e.cancelable) e.preventDefault();
    };
    const end = (e: TouchEvent) => {
      const active = gesture.current;
      if (active?.source !== 'touch') return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === active.id);
      if (touch) release(touch.clientX);
    };
    const cancel = () => { if (gesture.current?.source === 'touch') settle(0); };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end, { passive: true });
    node.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', cancel);
    };
  }, [begin, drag, release, settle]);
  const progress = size.width ? Math.min(1, Math.abs(offset) / size.width) : 0;
  const height = size.heights[1] + ((size.heights[offset < 0 ? 2 : 0] ?? 0) - size.heights[1]) * progress;

  return <div
    ref={viewport}
    className="calendar-month-viewport relative overflow-hidden select-none"
    style={{ touchAction: 'pan-y pinch-zoom', height: height || undefined, transition: settling ? `height ${DURATION}ms ${EASING}` : 'none' }}
    onPointerDown={e => {
      if (e.pointerType === 'touch' || !e.isPrimary || e.button !== 0) return;
      begin(e.pointerId, e.clientX, e.clientY, 'pointer');
    }}
    onPointerMove={e => {
      const start = gesture.current;
      if (e.pointerType === 'touch' || start?.source !== 'pointer' || start.id !== e.pointerId) return;
      if (drag(e.clientX, e.clientY) && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerUp={e => {
      if (e.pointerType !== 'touch' && gesture.current?.source === 'pointer' && gesture.current.id === e.pointerId) release(e.clientX);
    }}
    onPointerCancel={e => { if (e.pointerType !== 'touch' && gesture.current?.source === 'pointer') settle(0); }}
    onLostPointerCapture={e => { if (e.target === e.currentTarget && gesture.current?.source === 'pointer') settle(0); }}
    onClickCapture={e => {
      if (suppressClick.current && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
    }}
  >
    <style>{'@media (prefers-reduced-motion: reduce) { .calendar-month-page, .calendar-month-viewport { transition: none !important; } }'}</style>
    {pages.map((page, i) => <div
      key={i}
      ref={node => { panels.current[i] = node; }}
      aria-hidden={i !== 1}
      inert={i !== 1}
      className={`calendar-month-page left-0 top-0 w-full ${i === 1 ? 'relative' : 'absolute'}`}
      style={{ transform: `translate3d(calc(${(i - 1) * 100}% + ${offset}px), 0, 0)`, transition: settling ? `transform ${DURATION}ms ${EASING}` : 'none', willChange: 'transform' }}
      onTransitionEnd={e => { if (settling && i === 1 && e.target === e.currentTarget && e.propertyName === 'transform') finish(); }}
    >{page}</div>)}
  </div>;
}
