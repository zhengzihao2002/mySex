import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRecordingClock, recordingClockFrame, recordingElapsed } from './recording-clock.ts';

const epoch = Date.parse('2026-11-01T12:00:00Z');
const source = { id: 'session', startedAt: new Date(epoch).toISOString(), pausedAt: null as string | null, pausedSec: 0 };
const running = { pending: false, paused: false, optimistic: false, reset: 0 };

test('startup stays at zero until the server confirms its later start time', () => {
  const optimistic = { ...source, id: 'pending' };
  const initial = recordingClockFrame(optimistic, epoch, true);
  const waiting = advanceRecordingClock(initial, optimistic, epoch + 700, { ...running, pending: true });
  assert.equal(waiting.seconds, 0);
  const confirmed = advanceRecordingClock(waiting, { ...source, startedAt: new Date(epoch + 650).toISOString() }, epoch + 720, running);
  assert(confirmed.seconds >= 0 && confirmed.seconds <= .025);
});

test('pause freezes the dial through a delayed server response', () => {
  const before = recordingClockFrame(source, epoch + 12340);
  const frozen = advanceRecordingClock(before, source, epoch + 12840, { ...running, paused: true, optimistic: true });
  const saved = { ...source, pausedAt: new Date(epoch + 12800).toISOString() };
  const confirmed = advanceRecordingClock(frozen, saved, epoch + 12900, { ...running, paused: true });
  assert.equal(frozen.seconds, before.seconds);
  assert.equal(confirmed.seconds, before.seconds);
});

test('resume reconciles rounded break timing without backwards or sudden forwards movement', () => {
  const paused = { ...source, pausedAt: new Date(epoch + 12340).toISOString() };
  const before = recordingClockFrame(paused, epoch + 16000);
  const preview = advanceRecordingClock(before, paused, epoch + 16020, { ...running, optimistic: true });
  assert(Math.abs(preview.seconds - before.seconds - .02) < .00001);
  for (const pausedSec of [4, 5]) {
    let frame = before;
    const resumed = { ...source, pausedSec };
    for (let i = 1; i <= 120; i++) {
      const next = advanceRecordingClock(frame, resumed, epoch + 16000 + i * 16, running);
      assert(next.seconds >= frame.seconds);
      assert(next.seconds - frame.seconds <= .020001);
      frame = next;
    }
  }
});

test('foreground recovery and failed action rollback use the authoritative clock', () => {
  const before = recordingClockFrame(source, epoch + 1000);
  const returned = advanceRecordingClock(before, source, epoch + 61000, running);
  assert.equal(returned.seconds, 61);
  const paused = { ...source, pausedAt: new Date(epoch + 12000).toISOString() };
  const reset = advanceRecordingClock({ ...before, seconds: 12.8, at: epoch + 13000 }, paused, epoch + 13020, { ...running, paused: true, reset: 1 });
  assert.equal(reset.seconds, 12);
  assert.equal(recordingElapsed(paused, epoch + 50000), 12);
});
