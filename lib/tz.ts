// Time-zone aware formatting that renders identically on the server and the iPhone,
// so SSR output never mismatches hydration. The device's zone is stored in a `tz` cookie.

export const DEFAULT_TZ = 'UTC';

export function safeTz(tz: string | undefined | null) {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Calendar date (YYYY-MM-DD) of an instant in a zone. */
export function dayInTz(date: Date | string, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

export function timeInTz(date: Date | string, tz: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

export function hourInTz(date: Date | string, tz: string) {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
  return Number(h) % 24;
}

export function dateTimeInTz(date: Date | string, tz: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}
