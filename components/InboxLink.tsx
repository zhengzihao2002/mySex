'use client';

import Link from 'next/link';
import { createContext, useContext } from 'react';
import { Inbox } from 'lucide-react';
import { useT } from './I18nProvider';

const InboxCount = createContext(0);

export function InboxProvider({ count, children }: { count: number; children: React.ReactNode }) {
  return <InboxCount.Provider value={count}>{children}</InboxCount.Provider>;
}

export function InboxLink() {
  const { t } = useT();
  const count = useContext(InboxCount);
  return (
    <Link href="/inbox" className="relative shrink-0 rounded-full bg-surface-2 p-2.5 text-ink-2" title={t('Inbox')} aria-label={t('Inbox · {n} awaiting attention', { n: count })}>
      <Inbox size={20} />
      {count > 0 && <span aria-hidden="true" className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-menstrual ring-2 ring-bg" />}
    </Link>
  );
}
