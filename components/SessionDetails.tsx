'use client';

import type {SexSession} from '@/lib/types';
import {KIND_META} from './KindPicker';
import {PROTECTION,HEAT} from '@/lib/content';
import {useT} from './I18nProvider';
import {useTz} from './TzProvider';
import {useSessionViewer} from './SessionViewer';
import {SessionTimes} from './SessionTimes';
import {MapPinPreview} from './MapPinPicker';
import {samePin} from '@/lib/shared-session';
import {SessionEditDiff} from './SessionEditDiff';

export function SessionDetails({session:s,byName}:{session:SexSession;byName:string}) {
  const {t,f}=useT();
  const {tz}=useTz();
  const viewer=useSessionViewer();
  const protection=s.kind==='intercourse'?PROTECTION.find(p=>p.key===s.protection):null;
  const proposal=s.editRequest?.proposed;
  const changed=!!proposal?.location&&!samePin(s.latitude!=null&&s.longitude!=null?{latitude:s.latitude,longitude:s.longitude}:null,proposal.location);
  const location=changed?proposal!.location!:s;
  const name=(v:{city:string|null;region:string|null;country:string|null})=>[v.city,v.region,v.country].filter(Boolean).join(', ');
  const area=name(location);
  return <div className="space-y-5" data-session-details>
    <div><p className="text-lg font-semibold">{KIND_META[s.kind].emoji} {t(KIND_META[s.kind].label)}</p><p className="text-sm text-ink-2">{f.dateTimeInTz(s.startedAt,tz)}</p></div>
    <SessionTimes startedAt={s.startedAt} activeSec={s.durationSec??0} breakSec={s.pausedSec} breaks={s.breaks}/>
    {protection&&<div><p className="label">{t('Protection')}</p><p className="text-sm">{protection.emoji} {t(protection.label)}</p></div>}
    <div><p className="label">{t('What went down')}</p><div className="flex flex-wrap gap-2">{s.tags.length?s.tags.map(tag=><span key={tag} className="rounded-full bg-surface-2 px-3 py-2 text-sm">{t(tag)}</span>):<p className="text-sm text-ink-3">{t('Not recorded')}</p>}</div></div>
    <section className="space-y-3"><h3 className="font-semibold">{t('Each partner’s experience')}</h3>
      <p className="text-sm text-ink-2">{t('Average heat')}: <b className="text-ink">{s.rating??'–'}/5</b></p>
      {(['her','his'] as const).map(side=>{
        const own=(side==='her')===viewer.isHer;
        const review=s.feelings?.find(r=>own?r.userId===viewer.meId:r.userId!==viewer.meId);
        const note=[review?.feeling,review?.highlight].filter(Boolean).join('\n');
        return <div key={side} className="rounded-2xl bg-surface-2 p-3">
          <p className="font-semibold">{t(side==='her'?'Her':'Him')}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2"><span>🔥 {review?.rating!=null?`${review.rating}/5 · ${t(HEAT[review.rating-1])}`:t('Not rated')}</span><span>{t('Orgasms')}: {side==='her'?s.herOrgasms??'–':s.hisOrgasms??'–'}</span></div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-2">{note||t('No notes')}</p>
        </div>;
      })}
      {s.notes&&<div className="rounded-2xl bg-surface-2 p-3"><p className="label">{t('Previously recorded notes')}</p><p className="whitespace-pre-wrap break-words text-sm text-ink-2">{s.notes}</p></div>}
    </section>
    {proposal&&<SessionEditDiff session={s} proposed={proposal} includeLocation={false}/>}
    <section className="space-y-2"><h3 className="label">{t('Recorded location')}</h3>
      {changed?<p className="text-sm"><del className="text-ink-3">{name(s)||t('No recorded location')}</del> → <b>{area||t('New map location')}</b></p>:<p className="text-sm text-ink-2">{area||t(s.latitude!=null?'Unnamed map location':'No recorded location')}</p>}
      {location.latitude!=null&&location.longitude!=null&&<MapPinPreview value={{latitude:location.latitude,longitude:location.longitude}}/>}
    </section>
    <details className="text-sm text-ink-3"><summary className="min-h-11 cursor-pointer py-3">{t('Recording details')}</summary><p>{t('Logged by {name}',{name:byName})}</p>{s.place&&<p>{s.place}</p>}{s.ip&&<p>IP {s.ip}</p>}</details>
  </div>;
}
