'use client';
import { useEffect, useState } from 'react';
const KEY = 'mysex.recordingLocation';

/** Preferences persist in this browser; location permissions remain under browser/OS control. */
export function useRecordingLocation() {
  const [preferences, setPreferences] = useState({ useLocation: true, useGps: false });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (saved && typeof saved.useLocation === 'boolean' && typeof saved.useGps === 'boolean') setPreferences(saved);
    } catch { /* Use the defaults if storage is unavailable or contains invalid JSON. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch {}
  }, [ready, preferences]);
  return {
    ...preferences, ready,
    setUseLocation: (useLocation: boolean) => setPreferences(p => ({ ...p, useLocation })),
    setUseGps: (useGps: boolean) => setPreferences(p => ({ ...p, useGps })),
  };
}
