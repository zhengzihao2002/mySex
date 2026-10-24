'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { useT } from './I18nProvider';

export function InboxLink({ count }: { count: number }) {
  const { t } = useT();
  return (
    <div className="mb-1 flex justify-end">
      <Link href="/inbox" className="chip" aria-label={t('Inbox · {n} awaiting attention', { n: count })}>
        <Inbox size={16} /> {t('Inbox')}
        {count > 0 && <span className="ml-1 min-w-5 rounded-full bg-rose px-1 text-center text-xs font-bold text-white">{count}</span>}
      </Link>
    </div>
  );
}
