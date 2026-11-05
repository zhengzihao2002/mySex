/** Clock smoothing and bounded tap timestamps. Saved timing uses the persisted start. */
export type RecordingClockSource = { id: string; startedAt: string; pausedAt: string | null; pausedSec: number };
export type RecordingClockFrame = { id: string; seconds: number; at: number; pending: boolean; reset: number };

export function recordingElapsed(source: Pick<RecordingClockSource, 'startedAt' | 'pausedAt' | 'pausedSec'>, now: number) {
  return Math.max(0, ((source.pausedAt ? Date.parse(source.pausedAt) : now) - Date.parse(source.startedAt)) / 1000 - source.pausedSec);
}

export function recordingClockFrame(source: RecordingClockSource, now: number, pending = false, reset = 0): RecordingClockFrame {
  return { id: source.id, seconds: recordingElapsed(source, now), at: now, pending, reset };
}

export function advanceRecordingClock(previous: RecordingClockFrame, source: RecordingClockSource, now: number, options: { pending: boolean; paused: boolean; optimistic: boolean; reset: number }): RecordingClockFrame {
  if (options.pending) return recordingClockFrame(source, now, true, options.reset);
  const elapsed = Math.max(0, (now - previous.at) / 1000);
  const raw = recordingElapsed(source, now);
  // Fresh recordings and foreground recovery use the authoritative timestamps.
  if ((previous.id !== source.id && previous.id !== 'pending') || elapsed > 1 || previous.reset !== options.reset) {
    return recordingClockFrame(source, now, false, options.reset);
  }
  let seconds = previous.seconds;
  if (options.paused) {
    // Local pause/resume round trips must not move a frozen dial. Material remote
    // changes still reconcile to the saved timing rather than masking them.
    if (!options.optimistic && Math.abs(raw - seconds) > 2) seconds = raw;
  } else {
    const predicted = seconds + elapsed;
    const error = options.optimistic ? 0 : raw - predicted;
    // Reconcile subsecond rounding at 0.75–1.25x speed, never by moving backwards.
    seconds = Math.abs(error) > 2 ? raw : predicted + Math.max(-elapsed * .25, Math.min(elapsed * .25, error));
  }
  return { id: source.id, seconds, at: now, pending: false, reset: options.reset };
}

/** Preserve the Start tap through GPS/network waits; reject clock skew and old client timestamps. */
export function recordingStartTime(requested: string | undefined, receivedAt: number): string {
  const tap = requested ? Date.parse(requested) : NaN;
  return new Date(Number.isFinite(tap) && Math.abs(receivedAt - tap) <= 60000 ? Math.min(tap, receivedAt) : receivedAt).toISOString();
}
