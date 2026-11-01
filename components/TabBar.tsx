'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, Compass, Heart, Home, LockKeyhole, MessageSquare, Settings, Timer, Trophy } from 'lucide-react';
import { useT } from './I18nProvider';
import { SelectionPill } from './Motion';

const tabs = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/timer', label: 'Live timer', Icon: Timer },
  { href: '/insights', label: 'Insights', Icon: BarChart3 },
  { href: '/notes', label: 'Notes', Icon: MessageSquare },
];

export function TabBar({ unread, live }: { unread: number; live: boolean }) {
  const { t } = useT();
  const path = usePathname();
  return <nav className="nav-dock" aria-label={t('Main navigation')}>
    <Link href="/home" className="nav-brand"><span className="brand-mark"><Heart size={19} strokeWidth={1.5} /></span>mySex</Link>
    <div className="nav-items">
      {tabs.map(({ href, label, Icon }) => {
        const selected = path.startsWith(href);
        const timer = href === '/timer';
        return <Link key={href} href={href} className={`nav-item ${timer ? 'nav-record' : ''}`} aria-current={selected ? 'page' : undefined} aria-label={timer && live ? t('Live right now') : t(label)}>
          {selected && !timer && <SelectionPill id="main-navigation" />}
          <span className="relative"><Icon size={21} strokeWidth={1.65} className={timer && live ? 'animate-beat' : undefined} />{timer && live && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-bg ring-2 ring-rose" />}</span>
          <span className={timer ? 'record-label hidden' : ''}>{t(label)}</span>
          {href === '/notes' && unread > 0 && <span className="absolute right-2 top-1 min-w-4 rounded-full bg-rose px-1 text-center text-[9px] leading-4 text-bg">{unread}</span>}
        </Link>;
      })}
    </div>
    <div className="nav-secondary">
      {[{ href: '/play', label: 'Play', Icon: Compass }, { href: '/missions', label: 'Couple quests', Icon: Trophy }, { href: '/settings', label: 'Settings', Icon: Settings }].map(({ href, label, Icon }) => <Link key={href} href={href} className="nav-item" aria-current={path.startsWith(href) ? 'page' : undefined}>{path.startsWith(href) && <SelectionPill id="secondary-navigation" />}<Icon size={19} strokeWidth={1.6} />{t(label)}</Link>)}
    </div>
    <span className="nav-privacy"><LockKeyhole size={12} />{t('Just the two of you')}</span>
  </nav>;
}
