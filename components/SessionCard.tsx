'use client';
import {useSessionViewer,useSessionDraft} from './SessionViewer';
import {SessionPersonality} from './SessionPersonality';
import { useT } from './I18nProvider';

import { useState } from 'react';
import {SessionDetails} from './SessionDetails';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteSession, updateSession } from '@/app/actions';
import { flagEmoji, PROTECTION } from '@/lib/content';
import type { Score } from '@/lib/score';
import type { SexSession } from '@/lib/types';
import { ScoreBadge } from './ScoreBadge';
import { KIND_META } from './KindPicker';
import { SessionForm } from './SessionForm';
import { Sheet } from './Sheet';
import { useTz } from './TzProvider';
import { useRun } from './useRun';
import { FormError } from './FormError';
import {SessionEditDiff} from './SessionEditDiff';
import {sharedValues} from '@/lib/shared-session';
import {SessionScore} from './SessionScore';

export function SessionCard({
  s,
  score,
  places,
  byName,
  showDate,
  initiallyOpen=false,
  onClosed,
}: {
  s: SexSession;
  score?: Score;
  places: string[];
  byName: string;
  showDate?: string;
  initiallyOpen?: boolean;
  onClosed?:()=>void;
}) {
  const { t, f } = useT();
  const { tz } = useTz();
  const router = useRouter();
  const draft=useSessionDraft();
  const remembered=draft?.current?.sessionId===s.id&&draft.current.version===s.updatedAt?draft.current.values:undefined;
  const [open, setOpen] = useState(!!remembered||initiallyOpen);
  const [editing,setEditing]=useState(!!remembered);
  const close=()=>{if(draft?.current?.sessionId===s.id)draft.current=null;setOpen(false);setEditing(false);onClosed?.();};
  const viewer=useSessionViewer();
  const experience={...viewer,reviews:s.feelings??[]};
  const proposal=s.editRequest?.proposed;
  const editor=sharedValues(s,proposal);
  const [confirm, setConfirm] = useState(false);
  const { run, pending, error } = useRun();
  const where = s.place || [s.city, s.region].filter(Boolean).join(', ');
  const protection = s.kind==='intercourse'?PROTECTION.find((p) => p.key === s.protection):null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface-2/60 p-3 text-left">
        {score ? <ScoreBadge score={score} /> : <span className="text-2xl">❤️</span>}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {showDate ? `${showDate} · ` : ''}
            {KIND_META[s.kind].emoji} {f.timeInTz(s.startedAt, tz)} · {f.formatDuration(s.durationSec ?? 0)}
            {s.pausedSec ? <span className="text-xs font-normal text-ink-3"> (+{t('{d} breaks', { d: f.formatDuration(s.pausedSec) })})</span> : null}
            {s.rating ? <span className="ml-1">🔥 {s.rating}/5</span> : null}
          </p>
          <p className="truncate text-xs text-ink-3">
            {where ? (
              <>
                {flagEmoji(s.country)} {where}
              </>
            ) : (
              s.geoSource === 'map' ? t('Map pin') : s.geoSource === 'gps' ? t('GPS location') : t('Somewhere secret')
            )}
            {protection ? ` · ${protection.emoji} ${t(protection.label)}` : ''}
            {s.herOrgasms ? ` · ${t('her')} ×${s.herOrgasms}` : ''}
            {s.hisOrgasms ? ` · ${t('him')} ×${s.hisOrgasms}` : ''}
          </p>
          {s.tags.length > 0 && <p className="mt-0.5 truncate text-xs text-ink-2">{s.tags.map((x) => t(x)).join(' · ')}</p>}
          {s.deletionRequest && <p className="mt-1 text-xs text-luteal">{t('Deletion awaiting agreement')}</p>}
          {s.editRequest && <p className="mt-1 text-xs text-luteal">{t('Edit awaiting agreement')}</p>}
        </div>
      </button>

      <Sheet open={open} onClose={close} stableHeight={editing} viewKey={editing?'edit':'details'} title={editing?t('Edit session'):t('Session details')}>
        {open&&<>
        {score&&<SessionScore score={score} session={s}/>}
        <SessionPersonality tags={s.tags} />
        {editing&&s.editRequest && (
          <div className="mb-4 space-y-3">
            {proposal&&<SessionEditDiff session={s} proposed={proposal} includeLocation={false}/>}
            <Link href="/inbox" className="btn-ghost w-full">{t('A change to this session is waiting for agreement — open Inbox')}</Link>
          </div>
        )}
        {!editing&&<><SessionDetails session={s} byName={byName}/><button type="button" className="btn-primary sticky bottom-0 z-10 mt-4 w-full" onClick={()=>setEditing(true)}>{t('Edit session')}</button>{s.editRequest&&<Link href="/inbox" className="btn-ghost mt-3 w-full">{t('A change to this session is waiting for agreement — open Inbox')}</Link>}</>}
        {editing && experience && (
          <SessionForm
            mode="edit"
            draftValues={remembered}
            onDraftChange={values=>{if(draft)draft.current={sessionId:s.id,version:s.updatedAt,values};}}
            isHer={experience.isHer}
            exactTiming={{durationSec:Math.round(editor.durationMin*60),breakSec:Math.round(editor.breakMin*60)}}
            originalPin={s.latitude!=null&&s.longitude!=null?{latitude:s.latitude,longitude:s.longitude}:null}
            recordedLocation={s}
            proposedLocation={proposal?.location}
            originalActivity={s}
            timingBreaks={editor.startedAt===s.startedAt&&Math.round(editor.durationMin*60)===(s.durationSec??0)&&Math.round(editor.breakMin*60)===s.pausedSec?s.breaks:[]}
            places={places}
            initial={{
              hisRating:experience.reviews.find(r=>experience.isHer?r.userId!==experience.meId:r.userId===experience.meId)?.rating??null,
              herRating:experience.reviews.find(r=>experience.isHer?r.userId===experience.meId:r.userId!==experience.meId)?.rating??null,
              hisNotes:experience.reviews.filter(r=>experience.isHer?r.userId!==experience.meId:r.userId===experience.meId).map(r=>[r.feeling,r.highlight].filter(Boolean).join('\n')).join(''),
              herNotes:experience.reviews.filter(r=>experience.isHer?r.userId===experience.meId:r.userId!==experience.meId).map(r=>[r.feeling,r.highlight].filter(Boolean).join('\n')).join(''),
              kind: editor.kind??s.kind,
              startedAt: editor.startedAt,
              durationMin: Math.round(editor.durationMin*10)/10,
              breakMin: Math.round(editor.breakMin*10)/10,
              place: editor.place ?? '',
              mapPin: editor.location,
              rating: s.rating,
              protection: editor.protection,
              hisOrgasms: s.hisOrgasms,
              herOrgasms: s.herOrgasms,
              tags: editor.tags,
              notes: s.notes ?? '',
            }}
            submitLabel={t('Send change for approval')}
            error={error}
            pending={pending}
            onSubmit={async (v) => {
              const ok = await run(() =>
                updateSession(s.id, {
                  version: s.updatedAt,
                  hisRating:v.hisRating,herRating:v.herRating,hisNotes:v.hisNotes,herNotes:v.herNotes,hisOrgasms:v.hisOrgasms,herOrgasms:v.herOrgasms,
                  kind: v.kind,
                  startedAt: v.startedAt,
                  durationMin: v.durationMin,
                  breakMin: v.breakMin,
                  place: v.place || null,
                  mapPin: v.mapPin ?? undefined,
                  protection: v.protection,
                  tags: v.tags,
                  sharedFields:v.sharedFields,
                }),
              );
              if (ok) close();
            }}
          />
        )}
        {s.deletionRequest ? (
          <Link href="/inbox" className="btn-ghost mt-3 w-full">{t('View deletion request in Inbox')}</Link>
        ) : (
          <button className="btn mt-3 w-full text-menstrual" disabled={pending} onClick={() => setConfirm(true)}>
            <Trash2 size={16} /> {t('Request session deletion')}
          </button>
        )}
        </>}
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('Request deletion for both of you?')}>
        <p className="mb-4 text-sm text-ink-2">{t('Your partner will receive a request in their inbox. The session stays in both histories unless they agree. If they decline, you will be notified.')}</p>
        <FormError error={error} />
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>
            {t('Keep')}
          </button>
          <button
            className="btn bg-menstrual text-white"
            disabled={pending}
            onClick={async () => {
              if (await run(() => deleteSession(s.id, s.updatedAt))) {
                setConfirm(false);
                close();
                router.push('/inbox');
              }
            }}
          >
            {t('Send request')}
          </button>
        </div>
      </Sheet>
    </>
  );
}
