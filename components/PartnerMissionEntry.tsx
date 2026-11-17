'use client';
import Link from 'next/link';
import {ArrowUpRight,Gift,PackageOpen,Flag} from 'lucide-react';
import {useT} from './I18nProvider';

export function PartnerMissionEntry({invitations=0,approvals=0,ready=0,active=0}:{invitations?:number;approvals?:number;ready?:number;active?:number}){
  const {t}=useT();
  return <section className="space-y-2" aria-label={t('Partner goals')}>
    <Link href="/missions/partner" className="group relative block overflow-hidden rounded-3xl border border-rose/30 bg-gradient-to-br from-plum/30 via-surface to-surface p-5">
      <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-rose-2"><Flag size={15}/>{t('Partner goals')}</span><ArrowUpRight size={17} className="text-ink-3"/></div>
      <h2 className="mt-3 font-display text-2xl">{t('A challenge. A secret worth earning.')}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-2">{invitations?t('{n} goal invitations from your partner',{n:invitations}):active?t('{n} shared challenges in motion',{n:active}):t('Set the goal. Write the prize. Make it yours.')}</p>
      {!!invitations&&<span className="absolute right-5 top-5 h-2 w-2 rounded-full bg-rose ring-4 ring-rose/10"/>}
    </Link>
    <Link href="/storage" className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300"><PackageOpen size={21}/></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t('Storage')}</p><p className="text-xs text-ink-3">{approvals?t('{n} item uses need your approval',{n:approvals}):ready?t('{n} earned items ready to use',{n:ready}):t('Your earned prizes and claim items live here.')}</p></div>
      {ready>0&&<span className="flex items-center gap-1 text-sm font-semibold text-amber-300"><Gift size={14}/>{ready}</span>}
      <ArrowUpRight size={16} className="shrink-0 text-ink-3"/>
    </Link>
  </section>;
}
