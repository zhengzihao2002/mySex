import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRecordingClock, recordingClockFrame, recordingElapsed, recordingStartTime } from './recording-clock.ts';

const epoch = Date.parse('2026-11-01T12:00:00Z');
const source = { id: 'session', startedAt: new Date(epoch).toISOString(), pausedAt: null as string | null, pausedSec: 0 };
const running = { pending: false, paused: false, optimistic: false, reset: 0 };

test('startup runs immediately through GPS/server latency and confirmation keeps the tap time', () => {
  const optimistic = { ...source, id: 'pending' };
  const initial = recordingClockFrame(optimistic, epoch, true);
  const waiting = advanceRecordingClock(initial, optimistic, epoch + 1700, { ...running, pending: true });
  assert.equal(waiting.seconds, 1.7);
  const confirmed = advanceRecordingClock(waiting, source, epoch + 1720, running);
  assert(Math.abs(confirmed.seconds - 1.72) < .00001);
});

test('saved start time preserves a recent tap but bounds device clock skew', () => {
  assert.equal(recordingStartTime(new Date(epoch).toISOString(), epoch + 17000), new Date(epoch).toISOString());
  for (const value of [undefined, 'invalid', new Date(epoch-61000).toISOString(), new Date(epoch+61000).toISOString()]) {
    assert.equal(recordingStartTime(value,epoch),new Date(epoch).toISOString());
  }
  assert.equal(recordingStartTime(new Date(epoch+1000).toISOString(),epoch),new Date(epoch).toISOString());
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
