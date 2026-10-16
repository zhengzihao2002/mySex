'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

/** Runs a server action with pending + error state. Resolves true on success. */
export function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult | void>) =>
    new Promise<boolean>((resolve) => {
      setError(null);
      start(async () => {
        try {
          const res = await fn();
          if (res && !res.ok) {
            setError(res.error);
            resolve(false);
          } else resolve(true);
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.');
          resolve(false);
        }
      });
    });
  return { run, pending, error, setError };
}
