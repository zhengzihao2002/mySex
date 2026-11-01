'use client';

import { useEffect, useRef, useState } from 'react';
import { advanceRecordingClock, recordingClockFrame, type RecordingClockSource } from '@/lib/recording-clock';

export function useRecordingClock(source: RecordingClockSource, options: { pending: boolean; paused: boolean; optimistic: boolean; reset: number }) {
  const latest = useRef({ source, options });
  latest.current = { source, options };
  const frame = useRef(recordingClockFrame(source, Date.now(), options.pending, options.reset));
  const [display, setDisplay] = useState(() => ({ seconds: frame.current.seconds, now: frame.current.at }));
  useEffect(() => {
    let animation = 0;
    const tick = () => {
      const { source, options } = latest.current;
      const now = Date.now();
      frame.current = advanceRecordingClock(frame.current, source, now, options);
      setDisplay({ seconds: frame.current.seconds, now });
    };
    const loop = () => { tick(); animation = requestAnimationFrame(loop); };
    animation = requestAnimationFrame(loop);
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visible);
    return () => { cancelAnimationFrame(animation); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return display;
}
