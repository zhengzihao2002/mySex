'use client';
import { useT } from './I18nProvider';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarHeart, Home, MessageCircleHeart } from 'lucide-react';

const tabs = [
  { href: '/home', label: /*i18n*/ 'Home', Icon: Home },
  { href: '/calendar', label: /*i18n*/ 'Calendar', Icon: CalendarHeart },
  null,
  { href: '/insights', label: /*i18n*/ 'Insights', Icon: BarChart3 },
  { href: '/notes', label: /*i18n*/ 'Notes', Icon: MessageCircleHeart },
] as const;

export function TabBar({ unread, live }: { unread: number; live: boolean }) {
  const { t: tr } = useT();
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-bg/95 pb-[calc(env(safe-area-inset-bottom)*0.35)] backdrop-blur-2xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {tabs.map((t) =>
          t === null ? (
            <Link key="timer" href="/timer" aria-label="Live timer" className="relative -mt-7 flex justify-center">
              {live && <span className="absolute top-0 h-16 w-16 animate-ping rounded-full bg-rose/40" />}
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-plum shadow-xl shadow-rose/40 ring-4 ring-bg ${
                  path === '/timer' ? 'scale-105' : ''
                }`}
              >
                <svg viewBox="0 0 24 24" className={`h-7 w-7 fill-white ${live ? 'animate-beat' : ''}`}>
                  <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" />
                </svg>
              </span>
            </Link>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                path.startsWith(t.href) ? 'text-rose-2' : 'text-ink-3'
              }`}
            >
              <t.Icon size={22} strokeWidth={path.startsWith(t.href) ? 2.4 : 1.8} />
              {tr(t.label)}
              {t.href === '/notes' && unread > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-4 rounded-full bg-rose px-1 text-[10px] leading-4 font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
