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
    let reportedHeight = 0;
    let lastHeightChange = -Infinity;
    let keyboardOpen = false;
    let closing = false;
    let settleTimer = 0;
    const activeField = () => sheet === Array.from(document.querySelectorAll('[data-app-sheet]')).at(-1)
      && !sheet.inert ? findKeyboardField(document.activeElement, area) : null;

    const revealField = () => {
      const field = !closing && previousHeight < restingHeight ? activeField() : null;
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
      const rawHeight = viewport.height;
      if (rawHeight <= 0) return;
      const heightChanged = rawHeight !== reportedHeight;
      reportedHeight = rawHeight;
      const width = document.documentElement.clientWidth;
      const field = activeField();
      const rotated = width !== restingWidth;
      // Focus and scroll events can repeat the last stale toolbar sample.
      if (!heightChanged && !rotated && !field && !keyboardOpen) return;
      if (rotated) {
        closing = false;
        clearTimeout(settleTimer);
        settleTimer = 0;
        restingWidth = width;
        restingHeight = field || keyboardOpen ? Math.max(rawHeight, window.innerHeight) : rawHeight;
      }

      const wasOpen = keyboardOpen;
      if (!rotated && wasOpen && (!field || (rawHeight > previousHeight && restingHeight - rawHeight <= 112))) {
        closing = true;
      }
      // Safari can report full height, then briefly subtract its keyboard
      // toolbar again. While dismissing, allow the form to expand only down.
      const height = closing ? Math.min(restingHeight, Math.max(previousHeight, rawHeight)) : rawHeight;
      if (!closing) {
        restingHeight = !field && !wasOpen ? height : Math.max(restingHeight, height);
      }
      const coverage = field || wasOpen ? restingHeight - height : 0;
      keyboardOpen = closing || coverage > (wasOpen ? 0 : 60);
      if (closing && (coverage <= 32 || field) && (heightChanged || !settleTimer)) {
        clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          settleTimer = 0;
          if (coverage > 32) {
            // A shorter keyboard can look like the start of dismissal.
            if (activeField()) {
              closing = false;
              measure();
            }
            return;
          }
          // Finish at the lowest form edge already reached, even if the last
          // native notification was a stale, smaller viewport.
          if (previousHeight < restingHeight) sheet.dataset.sheetKeyboardGlide = 'false';
          restingHeight = previousHeight;
          closing = false;
          keyboardOpen = false;
          sheet.style.setProperty('--sheet-resting-height', `${restingHeight}px`);
          sheet.style.setProperty('--sheet-bottom-reserve', '0px');
          activeField()?.blur();
        }, 160);
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
      revealField();
    };

    const onFocus = () => {
      if (closing && activeField()) {
        closing = false;
        clearTimeout(settleTimer);
        settleTimer = 0;
      }
      measure();
    };

    const observer = new ResizeObserver(revealField);
    observer.observe(area);
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    area.addEventListener('focusin', onFocus);
    area.addEventListener('focusout', measure);
    measure();

    return () => {
      observer.disconnect();
      clearTimeout(settleTimer);
      stopTapFocus();
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      area.removeEventListener('focusin', onFocus);
      area.removeEventListener('focusout', measure);
      sheet.style.removeProperty('--sheet-resting-height');
      sheet.style.removeProperty('--sheet-bottom-reserve');
      delete sheet.dataset.sheetKeyboardGlide;
    };
  }, [enabled, root, scrollport]);
}
