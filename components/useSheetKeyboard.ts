'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { findKeyboardField, installKeyboardTapFocus, isIsolatedKeyboardStep } from '@/lib/keyboard-viewport';

export function useSheetKeyboard(
  enabled: boolean,
  root: RefObject<HTMLDivElement | null>,
  scrollport: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const sheet = root.current;
    const area = scrollport.current;
    const viewport = window.visualViewport;
    if (!enabled || !sheet || !area || !viewport || !window.matchMedia('(any-pointer: coarse)').matches) return;

    const stopTapFocus = installKeyboardTapFocus(area);
    let restingHeight = viewport.height;
    let restingWidth = document.documentElement.clientWidth;
    let previousHeight = restingHeight;
    let lastHeightChange = -Infinity;
    let keyboardOpen = false;
    let settleTimer = 0;
    const activeField = () => sheet === Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)
      && !sheet.inert ? findKeyboardField(document.activeElement, area) : null;

    const revealField = () => {
      const field = previousHeight < restingHeight ? activeField() : null;
      if (!field) return;
      const box = area.getBoundingClientRect();
      const rect = field.getBoundingClientRect();
      const top = box.top + 8;
      const bottom = box.bottom - 8;
      if (bottom <= top) return;
      // Scroll the form only. Avoid restarting smooth scrolling on every
      // viewport frame or leaving a tall field's top above the scroll area.
      const delta = rect.top < top || rect.height > bottom - top
        ? rect.top - top
        : Math.max(0, rect.bottom - bottom);
      if (Math.abs(delta) > 1) area.scrollTop += delta;
    };

    const measure = () => {
      const height = viewport.height;
      if (height <= 0) return;
      const width = document.documentElement.clientWidth;
      const field = activeField();
      const rotated = width !== restingWidth;
      if (rotated) {
        restingWidth = width;
        restingHeight = field || keyboardOpen ? Math.max(height, window.innerHeight) : height;
      }
      if (!field && !keyboardOpen) restingHeight = height;
      else restingHeight = Math.max(restingHeight, height);

      const wasOpen = keyboardOpen;
      const coverage = field || wasOpen ? restingHeight - height : 0;
      keyboardOpen = coverage > (wasOpen ? 0 : 60);
      clearTimeout(settleTimer);
      if (wasOpen && coverage > 0 && coverage <= 32) {
        // A late closing frame should not move the shell. Rebase only if the
        // browser has finished with a slightly different resting viewport.
        settleTimer = window.setTimeout(() => {
          restingHeight = viewport.height;
          measure();
        }, 120);
      }

      if (height !== previousHeight || rotated) {
        const now = performance.now();
        sheet.dataset.sheetKeyboardGlide = String(!rotated && (wasOpen || keyboardOpen)
          && isIsolatedKeyboardStep(height - previousHeight, now - lastHeightChange));
        previousHeight = height;
        lastHeightChange = now;
      }
      // Keep the backdrop and header at their resting position. Use only the
      // visual viewport height; Safari can briefly report a stale offsetTop.
      sheet.style.setProperty('--sheet-resting-height', `${restingHeight}px`);
      sheet.style.setProperty('--sheet-bottom-reserve', `${coverage > 0 ? coverage + 8 : 0}px`);
      if (wasOpen && !keyboardOpen) field?.blur();
      revealField();
    };

    const observer = new ResizeObserver(revealField);
    observer.observe(area);
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    area.addEventListener('focusin', measure);
    area.addEventListener('focusout', measure);
    measure();

    return () => {
      observer.disconnect();
      clearTimeout(settleTimer);
      stopTapFocus();
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      area.removeEventListener('focusin', measure);
      area.removeEventListener('focusout', measure);
      sheet.style.removeProperty('--sheet-resting-height');
      sheet.style.removeProperty('--sheet-bottom-reserve');
      delete sheet.dataset.sheetKeyboardGlide;
    };
  }, [enabled, root, scrollport]);
}
