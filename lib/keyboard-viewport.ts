const editable = ':not([readonly]):not(:disabled):not([inputmode="none"])';
const textInput = ':is(:not([type]),[type="text"],[type="search"],[type="number"],[type="email"],[type="tel"],[type="url"],[type="password"])';
const keyboardField = `textarea${editable},input${textInput}${editable}`;

export function findKeyboardField(target: EventTarget | null, within: HTMLElement) {
  if (!(target instanceof Element)) return null;
  const field = target.closest<HTMLInputElement | HTMLTextAreaElement>(keyboardField);
  return field && within.contains(field) ? field : null;
}

/** Some Safari versions report only the endpoint of the native keyboard animation. */
export function isIsolatedKeyboardStep(delta: number, elapsed: number) {
  return Math.abs(delta) >= 72 && elapsed > 80;
}

/** Bypass iOS's native tap-to-focus scroll without delaying keyboard activation. */
export function installKeyboardTapFocus(container: HTMLElement) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return () => {};

  const tappedField = (target: EventTarget | null) => {
    const control = target instanceof Element ? target.closest('label')?.control : null;
    return findKeyboardField(target, container) ?? findKeyboardField(control ?? null, container);
  };
  let tap: { field: HTMLElement; id: number; x: number; y: number; time: number } | null = null;
  const cancel = () => { tap = null; };
  const start = (event: TouchEvent) => {
    const field = tappedField(event.target);
    const touch = event.touches[0];
    tap = field && event.touches.length === 1
      ? { field, id: touch.identifier, x: touch.clientX, y: touch.clientY, time: event.timeStamp }
      : null;
  };
  const moved = (touch: Touch) => !tap || touch.identifier !== tap.id
    || Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 10;
  const move = (event: TouchEvent) => {
    if (event.touches.length !== 1 || moved(event.touches[0])) cancel();
  };
  const end = (event: TouchEvent) => {
    const field = tap?.field;
    const quickTap = tap && event.timeStamp - tap.time < 450
      && event.touches.length === 0 && event.changedTouches.length === 1 && !moved(event.changedTouches[0]);
    cancel();
    if (!quickTap || !field || field !== tappedField(event.target)) return;
    if (!event.cancelable || event.defaultPrevented || document.activeElement === field) return;
    event.preventDefault();
    field.focus({ preventScroll: true });
  };
  container.addEventListener('touchstart', start, { passive: true });
  container.addEventListener('touchmove', move, { passive: true });
  container.addEventListener('touchcancel', cancel);
  container.addEventListener('touchend', end, { passive: false });
  return () => {
    container.removeEventListener('touchstart', start);
    container.removeEventListener('touchmove', move);
    container.removeEventListener('touchcancel', cancel);
    container.removeEventListener('touchend', end);
  };
}
