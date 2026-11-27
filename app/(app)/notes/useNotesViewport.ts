'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { lockPageScroll } from '@/lib/page-scroll-lock';
import { installKeyboardTapFocus, isIsolatedKeyboardStep } from '@/lib/keyboard-viewport';

function resetDocumentScroll() {
  if (window.scrollX || window.scrollY) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
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
    const stopFocusOnTap = installKeyboardTapFocus(composer);
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
        const isolatedJump = isIsolatedKeyboardStep(height - previousHeight, now - lastHeightChange);
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
