'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const DURATION = 260;
const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/** Three mounted months keep dragging immediate, including the incoming month's contents. */
export function MonthPager({ pages, onChange }: { pages: [ReactNode, ReactNode, ReactNode]; onChange: (delta: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const gesture = useRef<{ id: number; x: number; y: number; axis: 'pending' | 'x' | 'y' } | null>(null);
  const suppressClick = useRef(false);
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

  const settle = (delta: number) => {
    gesture.current = null;
    destination.current = delta;
    finishing.current = false;
    setSettling(true);
    setOffset(-delta * (viewport.current?.clientWidth ?? 0));
  };
  const progress = size.width ? Math.min(1, Math.abs(offset) / size.width) : 0;
  const height = size.heights[1] + ((size.heights[offset < 0 ? 2 : 0] ?? 0) - size.heights[1]) * progress;

  return <div
    ref={viewport}
    className="calendar-month-viewport relative overflow-hidden select-none"
    style={{ touchAction: 'pan-y pinch-zoom', height: height || undefined, transition: settling ? `height ${DURATION}ms ${EASING}` : 'none' }}
    onPointerDown={e => {
      if (gesture.current) { settle(0); return; }
      if (settling || !e.isPrimary || e.button !== 0) return;
      suppressClick.current = false;
      gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: 'pending' };
    }}
    onPointerMove={e => {
      const start = gesture.current;
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (start.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
        start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (start.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (start.axis !== 'x') return;
      suppressClick.current = true;
      const width = e.currentTarget.clientWidth;
      setOffset(Math.max(-width, Math.min(width, dx)));
    }}
    onPointerUp={e => {
      const start = gesture.current;
      if (!start || start.id !== e.pointerId) return;
      if (start.axis === 'x') {
        const dx = e.clientX - start.x;
        settle(Math.abs(dx) >= e.currentTarget.clientWidth / 2 ? (dx < 0 ? 1 : -1) : 0);
      } else gesture.current = null;
    }}
    onPointerCancel={() => { if (gesture.current) settle(0); }}
    onLostPointerCapture={e => { if (e.target === e.currentTarget && gesture.current) settle(0); }}
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
