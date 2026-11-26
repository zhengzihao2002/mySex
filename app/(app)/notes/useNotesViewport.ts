'use client';

import { useLayoutEffect, type RefObject } from 'react';

export function useNotesViewport(page: RefObject<HTMLDivElement | null>, thread: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const notes = page.current;
    const list = thread.current;
    const frame = notes?.closest<HTMLElement>('.app-frame');
    const composer = notes?.querySelector('textarea');
    if (!notes || !list || !frame || !composer) return;

    const viewport = window.visualViewport;
    const visibleHeight = () => viewport?.height ?? window.innerHeight;
    let restingHeight = visibleHeight();
    let restingWidth = document.documentElement.clientWidth;
    let open = false;
    let frameRequest = 0;
    let pinned = true;
    let listHeight = list.clientHeight;

    const measure = () => {
      frameRequest = 0;
      const height = visibleHeight();
      const width = document.documentElement.clientWidth;
      const focused = document.activeElement === composer;
      const bounds = frame.getBoundingClientRect();

      // A rotation invalidates the resting height. The fixed frame still gives
      // us the new layout size when the keyboard overlays it.
      if (width !== restingWidth) {
        restingWidth = width;
        restingHeight = focused || open ? Math.max(height, bounds.height) : height;
      }
      const loss = restingHeight - height;
      open = (focused || open) && loss > (open ? 45 : 90);
      if (!open && !focused) restingHeight = height;

      if (open) {
        // Count only the part the keyboard actually covers. Some browsers
        // resize the fixed frame itself, in which case this inset is zero.
        const pan = Math.min(Math.max(0, viewport?.offsetTop ?? 0), Math.max(0, bounds.height - height));
        notes.style.setProperty('--notes-pan', `${pan}px`);
        frame.style.setProperty('--notes-keyboard-inset', `${Math.max(0, bounds.height - pan - height)}px`);
      } else {
        notes.style.removeProperty('--notes-pan');
        frame.style.removeProperty('--notes-keyboard-inset');
      }
      notes.dataset.keyboardOpen = String(open);
    };

    const schedule = () => {
      if (!frameRequest) frameRequest = requestAnimationFrame(measure);
    };
    const trackScroll = () => {
      // A resize can dispatch scroll before ResizeObserver restores the bottom.
      if (list.clientHeight !== listHeight) return;
      pinned = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
    };
    // The list and composer share a single layout. Keep the latest note in
    // view as that layout animates, unless the reader scrolled back.
    const observer = new ResizeObserver(() => {
      listHeight = list.clientHeight;
      if (pinned) list.scrollTop = list.scrollHeight;
    });
    observer.observe(list);
    list.addEventListener('scroll', trackScroll, { passive: true });
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    composer.addEventListener('focus', schedule);
    composer.addEventListener('blur', schedule);
    measure();

    return () => {
      cancelAnimationFrame(frameRequest);
      observer.disconnect();
      list.removeEventListener('scroll', trackScroll);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      composer.removeEventListener('focus', schedule);
      composer.removeEventListener('blur', schedule);
      notes.style.removeProperty('--notes-pan');
      frame.style.removeProperty('--notes-keyboard-inset');
      delete notes.dataset.keyboardOpen;
    };
  }, [page, thread]);
}
