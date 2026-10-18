'use client';
import { useT } from './I18nProvider';

import { useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { deleteSession, updateSession } from '@/app/actions';
import { flagEmoji, HEAT, PROTECTION } from '@/lib/content';
import { formatDuration } from '@/lib/dates';
import type { Score } from '@/lib/score';
import { timeInTz } from '@/lib/tz';
import type { SexSession } from '@/lib/types';
import { ScoreBadge } from './ScoreBadge';
import { KIND_META } from './KindPicker';
import { SessionForm } from './SessionForm';
import { SessionTimes } from './SessionTimes';
import { Sheet } from './Sheet';
import { useTz } from './TzProvider';
import { useRun } from './useRun';

export function SessionCard({
  s,
  score,
  places,
  byName,
  showDate,
}: {
  s: SexSession;
  score?: Score;
  places: string[];
  byName: string;
  showDate?: string;
}) {
  const { t, f } = useT();
  const { tz } = useTz();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { run, pending, error } = useRun();
  const where = s.place || [s.city, s.region].filter(Boolean).join(', ');
  const protection = PROTECTION.find((p) => p.key === s.protection);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface-2/60 p-3 text-left">
        {score ? <ScoreBadge score={score} /> : <span className="text-2xl">❤️</span>}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {showDate ? `${showDate} · ` : ''}
            {KIND_META[s.kind].emoji} {f.timeInTz(s.startedAt, tz)} · {f.formatDuration(s.durationSec ?? 0)}
            {s.pausedSec ? <span className="text-xs font-normal text-ink-3"> (+{t('{d} breaks', { d: f.formatDuration(s.pausedSec) })})</span> : null}
            {s.rating ? <span className="ml-1">{'🔥'.repeat(s.rating)}</span> : null}
          </p>
          <p className="truncate text-xs text-ink-3">
            {where ? (
              <>
                {flagEmoji(s.country)} {where}
              </>
            ) : (
              t('Somewhere secret')
            )}
            {protection ? ` · ${protection.emoji} ${t(protection.label)}` : ''}
            {s.herOrgasms ? ` · ${t('her')} ×${s.herOrgasms}` : ''}
            {s.hisOrgasms ? ` · ${t('him')} ×${s.hisOrgasms}` : ''}
          </p>
          {s.tags.length > 0 && <p className="mt-0.5 truncate text-xs text-ink-2">{s.tags.map((x) => t(x)).join(' · ')}</p>}
        </div>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('Edit session')}>
        <div className="mb-3">
          <SessionTimes startedAt={s.startedAt} activeSec={s.durationSec ?? 0} breakSec={s.pausedSec ?? 0} breaks={s.breaks} />
        </div>
        <div className="mb-4 space-y-1 rounded-2xl bg-surface-2 p-3 text-xs text-ink-3">
          <p>{t('Logged by {name}', { name: byName })}</p>
          {(s.city || s.ip) && (
            <p className="flex items-center gap-1">
              <MapPin size={12} />
              {[s.city, s.region, s.country].filter(Boolean).join(', ') || t('Unknown city')}
              {s.ip ? ` · IP ${s.ip}` : ''}
              {s.latitude != null && s.longitude != null && (
                <a className="ml-auto text-rose-2" href={`https://maps.apple.com/?ll=${s.latitude},${s.longitude}&q=Here`} target="_blank" rel="noreferrer">
                  {t('Open map')}
                </a>
              )}
            </p>
          )}
          {score && (
            <p>
              {t('Score')} {score.total}/100 · {score.emoji} {t(score.grade)}
              {s.rating ? ` · ${t('rated')} “${t(HEAT[s.rating - 1])}”` : ''}
            </p>
          )}
        </div>
        {open && (
          <SessionForm
            mode="edit"
            places={places}
            initial={{
              kind: s.kind,
              startedAt: s.startedAt,
              durationMin: Math.round((s.durationSec ?? 0) / 6) / 10,
              breakMin: Math.round((s.pausedSec ?? 0) / 6) / 10,
              place: s.place ?? '',
              rating: s.rating,
              protection: s.protection,
              hisOrgasms: s.hisOrgasms,
              herOrgasms: s.herOrgasms,
              tags: s.tags,
              notes: s.notes ?? '',
            }}
            submitLabel={t('Save changes')}
            error={error}
            pending={pending}
            onSubmit={async (v) => {
              const ok = await run(() =>
                updateSession(s.id, {
                  version: s.updatedAt,
                  kind: v.kind,
                  startedAt: v.startedAt,
                  durationMin: v.durationMin,
                  breakMin: v.breakMin,
                  place: v.place || null,
                  rating: v.rating,
                  protection: v.protection,
                  hisOrgasms: v.hisOrgasms,
                  herOrgasms: v.herOrgasms,
                  tags: v.tags,
                  notes: v.notes || null,
                }),
              );
              if (ok) setOpen(false);
            }}
          />
        )}
        <button className="btn mt-3 w-full text-menstrual" onClick={() => setConfirm(true)}>
          <Trash2 size={16} /> {t('Delete session')}
        </button>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('Delete for both of you?')}>
        <p className="mb-4 text-sm text-ink-2">{t('This removes it from both your and your partner’s history. Can’t be undone.')}</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>
            {t('Keep')}
          </button>
          <button
            className="btn bg-menstrual text-white"
            disabled={pending}
            onClick={async () => {
              if (await run(() => deleteSession(s.id))) {
                setConfirm(false);
                setOpen(false);
              }
            }}
          >
            {t('Delete')}
          </button>
        </div>
      </Sheet>
    </>
  );
}
