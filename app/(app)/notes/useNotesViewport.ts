'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { lockPageScroll } from '@/lib/page-scroll-lock';

function resetDocumentScroll() {
  if (window.scrollX || window.scrollY) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
}

/** iOS's default tap can pan the native viewport even when the document is locked. */
function focusOnTap(composer: HTMLTextAreaElement) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return () => {};

  let tap: { id: number; x: number; y: number; time: number } | null = null;
  const cancel = () => { tap = null; };
  const start = (event: TouchEvent) => {
    const touch = event.touches[0];
    tap = event.touches.length === 1
      ? { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: event.timeStamp }
      : null;
  };
  const moved = (touch: Touch) => !tap || touch.identifier !== tap.id
    || Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 10;
  const move = (event: TouchEvent) => {
    if (event.touches.length !== 1 || moved(event.touches[0])) cancel();
  };
  const end = (event: TouchEvent) => {
    const quickTap = tap && event.timeStamp - tap.time < 450
      && event.touches.length === 0 && event.changedTouches.length === 1 && !moved(event.changedTouches[0]);
    cancel();
    if (!quickTap || !event.cancelable || event.defaultPrevented || document.activeElement === composer) return;
    // Keep focus in the user gesture so iOS still opens the keyboard.
    event.preventDefault();
    composer.focus({ preventScroll: true });
  };
  composer.addEventListener('touchstart', start, { passive: true });
  composer.addEventListener('touchmove', move, { passive: true });
  composer.addEventListener('touchcancel', cancel);
  composer.addEventListener('touchend', end, { passive: false });
  return () => {
    composer.removeEventListener('touchstart', start);
    composer.removeEventListener('touchmove', move);
    composer.removeEventListener('touchcancel', cancel);
    composer.removeEventListener('touchend', end);
  };
}

export function useNotesViewport(page: RefObject<HTMLDivElement | null>, thread: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const notes = page.current;
    const list = thread.current;
    const frame = notes?.closest<HTMLElement>('.app-frame');
    const composer = notes?.querySelector<HTMLTextAreaElement>('.notes-composer textarea');
    if (!notes || !list || !frame || !composer) return;

    resetDocumentScroll();
    const unlock = lockPageScroll();
    const stopFocusOnTap = focusOnTap(composer);
    const viewport = window.visualViewport;
    const touchDevice = window.matchMedia('(pointer: coarse)');
    const body = document.body;
    const readHeight = () => viewport?.height ?? window.innerHeight;
    let restingHeight = readHeight();
    let restingWidth = document.documentElement.clientWidth;
    let previousHeight = restingHeight;
    let lastHeightChange = -Infinity;
    let keyboardOpen = false;
    let pinned = true;
    let listHeight = list.clientHeight;

    const measure = () => {
      const height = readHeight();
      if (height <= 0) return;
      const width = document.documentElement.clientWidth;
      const focused = document.activeElement === composer;
      const widthChanged = width !== restingWidth;
      if (widthChanged) {
        restingWidth = width;
        restingHeight = focused || keyboardOpen ? Math.max(height, window.innerHeight) : height;
      }
      if ((!focused && !keyboardOpen) || !touchDevice.matches) restingHeight = height;
      else restingHeight = Math.max(height, restingHeight);

      const wasOpen = keyboardOpen;
      let keyboardCoverage = focused || wasOpen ? restingHeight - height : 0;
      keyboardOpen = keyboardCoverage > (wasOpen ? 32 : 60);
      if (wasOpen && !keyboardOpen) {
        // Browser controls can leave a slightly different viewport after Done.
        // Once the keyboard clears the composer, take the new resting height.
        restingHeight = height;
        keyboardCoverage = 0;
      }

      // Follow live keyboard frames without adding lag. Some versions of
      // Safari send one large resize instead of streaming the movement.
      if (height !== previousHeight || widthChanged) {
        const now = performance.now();
        const isolatedJump = Math.abs(height - previousHeight) >= 72 && now - lastHeightChange > 80;
        notes.dataset.keyboardGlide = String(touchDevice.matches && !widthChanged && (keyboardOpen || wasOpen) && isolatedJump);
        previousHeight = height;
        lastHeightChange = now;
      }
      // Ignore offsetTop, which can report a stale native focus scroll on iOS.
      frame.style.setProperty('--notes-visible-height', `${height}px`);
      frame.style.setProperty('--notes-keyboard-coverage', `${keyboardCoverage}px`);
      body.style.setProperty('--notes-resting-height', `${restingHeight}px`);
      notes.dataset.keyboardOpen = String(keyboardOpen);
      if (wasOpen && !keyboardOpen) {
        // Done can dismiss the keyboard without blurring. Re-arm tap-to-focus.
        if (focused) composer.blur();
        resetDocumentScroll();
      }
    };

    const trackScroll = () => {
      // A resize can dispatch scroll before ResizeObserver restores the bottom.
      if (list.clientHeight !== listHeight) return;
      pinned = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
    };
    const observer = new ResizeObserver(() => {
      listHeight = list.clientHeight;
      if (pinned) list.scrollTop = list.scrollHeight;
    });
    const preventPagePan = (event: TouchEvent) => {
      if (!event.cancelable || event.touches.length !== 1 || !(event.target instanceof Element)) return;
      const target = event.target;
      if (target === composer && document.activeElement === composer) return;
      const area = target.closest('.notes-thread, .notes-options');
      // WebKit can chain a gesture to the viewport if the inner area fits all its content.
      if (!area || (area.scrollHeight <= area.clientHeight && area.scrollWidth <= area.clientWidth)) {
        event.preventDefault();
      }
    };
    observer.observe(list);
    list.addEventListener('scroll', trackScroll, { passive: true });
    notes.addEventListener('touchmove', preventPagePan, { passive: false });
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('pageshow', measure);
    composer.addEventListener('focus', measure);
    composer.addEventListener('blur', measure);
    measure();

    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', trackScroll);
      notes.removeEventListener('touchmove', preventPagePan);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('pageshow', measure);
      composer.removeEventListener('focus', measure);
      composer.removeEventListener('blur', measure);
      frame.style.removeProperty('--notes-visible-height');
      frame.style.removeProperty('--notes-keyboard-coverage');
      body.style.removeProperty('--notes-resting-height');
      delete notes.dataset.keyboardOpen;
      delete notes.dataset.keyboardGlide;
      stopFocusOnTap();
      unlock();
    };
  }, [page, thread]);
}
