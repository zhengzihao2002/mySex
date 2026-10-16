'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect } from 'react';

const TzContext = createContext<{ tz: string; today: string }>({ tz: 'UTC', today: '1970-01-01' });
export const useTz = () => useContext(TzContext);

/** Shares the server-resolved zone/today with client components and keeps the `tz` cookie fresh. */
export function TzProvider({ tz, today, children }: { tz: string; today: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (device && device !== tz) {
      document.cookie = `tz=${encodeURIComponent(device)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [tz, router]);
  return <TzContext.Provider value={{ tz, today }}>{children}</TzContext.Provider>;
}
