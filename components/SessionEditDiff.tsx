'use client';

import {useT} from './I18nProvider';
import {useTz} from './TzProvider';
import {MapPinPreview} from './MapPinPicker';
import {KIND_META} from './KindPicker';
import {PROTECTION} from '@/lib/content';
import {samePin, type SessionProposal} from '@/lib/shared-session';
import type {SexSession} from '@/lib/types';

/** The saved record stays intact; the proposal is shown beside it until both agree. */
export function SessionEditDiff({session:s,proposed:p}:{session:SexSession;proposed:SessionProposal}) {
  const {t,f}=useT();
  const {tz}=useTz();
  const dash='–';
  const protection=(key:string|null)=>{const item=PROTECTION.find(p=>p.key===key);return item?`${item.emoji} ${t(item.label)}`:dash;};
  const rows:[string,string,string][]=[
    [t('Type'),t(KIND_META[s.kind].label),t(KIND_META[p.kind??s.kind].label)],
    [t('When'),f.dateTimeInTz(s.startedAt,tz),f.dateTimeInTz(p.startedAt,tz)],
    [t('Active time'),f.formatDuration(s.durationSec??0),f.formatDuration(Math.round(p.durationMin*60))],
    [t('Breaks'),f.formatDuration(s.pausedSec),f.formatDuration(Math.round(p.breakMin*60))],
    [t('Where'),s.place||dash,p.place||dash],
    [t('Protection'),protection(s.protection),protection(p.protection)],
    [t('What went down'),s.tags.map(x=>t(x)).join(', ')||dash,p.tags.map(x=>t(x)).join(', ')||dash],
  ].filter((r):r is [string,string,string]=>r[1]!==r[2]);
  const original=s.latitude!=null&&s.longitude!=null?{latitude:s.latitude,longitude:s.longitude}:null;
  const moved=!!p.location&&!samePin(original,p.location);
  const locationName=(v:{city:string|null;region:string|null;country:string|null})=>[v.city,v.region,v.country].filter(Boolean).join(', ')||t('Unnamed map location');
  return <div className="space-y-3 rounded-2xl bg-surface-2 p-3 text-sm" data-session-edit-diff>
    {rows.map(([label,from,to])=><div key={label}><p className="text-xs text-ink-3">{label}</p><p className="break-words whitespace-pre-wrap"><del className="text-ink-3">{from}</del> → <b>{to}</b></p></div>)}
    {moved&&p.location&&<div className="space-y-2">
      <div><p className="text-xs text-ink-3">{t('Current location')}</p><del className="text-ink-3">{original?locationName(s):t('No recorded location')}</del></div>
      <div><p className="text-xs text-ink-3">{t('Proposed location')}</p><b>{locationName(p.location)}</b><MapPinPreview value={p.location}/></div>
    </div>}
    {!rows.length&&!moved&&<p className="text-ink-3">{t('No visible differences.')}</p>}
  </div>;
}
