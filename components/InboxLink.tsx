'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useT } from './I18nProvider';
type Snapshot = { count: number; version: string; active: string | null };
const InboxState = createContext<Snapshot>({ count: 0, version: '', active: null });
export function InboxProvider({ initial, children }: { initial: Snapshot; children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const previous = useRef(initial);
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { setState(initial); previous.current = initial; }, [initial]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    async function poll() {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== 'visible' || controller) return;
      controller = new AbortController();
      try {
        const response = await fetch('/api/inbox', { cache: 'no-store', signal: controller.signal });
        if (response.ok) {
          const next: Snapshot = await response.json();
          if (stopped) return;
          const changed = previous.current.version !== next.version;
          const activeChanged = previous.current.active !== next.active;
          previous.current = next;
          setState(next);
          if (next.active && path === '/inbox') router.replace('/timer');
          else if ((changed && path === '/inbox') || activeChanged) router.refresh();
        }
      } catch { /* Retry when connected again; no notification or popup. */ }
      finally { controller = null; if (!stopped) timer = setTimeout(poll, 15000); }
    }
    const wake = () => { if (document.visibilityState === 'visible') void poll(); };
    timer = setTimeout(poll, 15000);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); };
  }, [path, router]);
  return <InboxState.Provider value={state}>{children}</InboxState.Provider>;
}
export function InboxLink() {
  const { t } = useT();
  const { count, active } = useContext(InboxState);
  if (active) return null;
  return <Link href="/inbox" className="relative shrink-0 rounded-full bg-surface-2 p-2.5 text-ink-2" title={t('Inbox')} aria-label={t('Inbox · {n} awaiting attention', { n: count })}>
    <Inbox size={20} />
    {count > 0 && <span aria-hidden="true" className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-menstrual ring-2 ring-bg" />}
  </Link>;
}
