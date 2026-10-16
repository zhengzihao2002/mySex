'use client';

import { useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { deleteSession, updateSession } from '@/app/actions';
import { flagEmoji, HEAT, PROTECTION } from '@/lib/content';
import { formatDuration } from '@/lib/dates';
import type { Score } from '@/lib/score';
import { timeInTz } from '@/lib/tz';
import type { SexSession } from '@/lib/types';
import { ScoreBadge } from './ScoreBadge';
import { SessionForm } from './SessionForm';
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
            {timeInTz(s.startedAt, tz)} · {formatDuration(s.durationSec ?? 0)}
            {s.rating ? <span className="ml-1">{'🔥'.repeat(s.rating)}</span> : null}
          </p>
          <p className="truncate text-xs text-ink-3">
            {where ? (
              <>
                {flagEmoji(s.country)} {where}
              </>
            ) : (
              'Somewhere secret'
            )}
            {protection ? ` · ${protection.emoji} ${protection.label}` : ''}
            {s.herOrgasms ? ` · her ×${s.herOrgasms}` : ''}
            {s.hisOrgasms ? ` · him ×${s.hisOrgasms}` : ''}
          </p>
          {s.tags.length > 0 && <p className="mt-0.5 truncate text-xs text-ink-2">{s.tags.join(' · ')}</p>}
        </div>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Edit session">
        <div className="mb-4 space-y-1 rounded-2xl bg-surface-2 p-3 text-xs text-ink-3">
          <p>Logged by {byName}</p>
          {(s.city || s.ip) && (
            <p className="flex items-center gap-1">
              <MapPin size={12} />
              {[s.city, s.region, s.country].filter(Boolean).join(', ') || 'Unknown city'}
              {s.ip ? ` · IP ${s.ip}` : ''}
              {s.latitude != null && s.longitude != null && (
                <a className="ml-auto text-rose-2" href={`https://maps.apple.com/?ll=${s.latitude},${s.longitude}&q=Here`} target="_blank" rel="noreferrer">
                  Open map
                </a>
              )}
            </p>
          )}
          {score && (
            <p>
              Score {score.total}/100 · {score.emoji} {score.grade}
              {s.rating ? ` · rated “${HEAT[s.rating - 1]}”` : ''}
            </p>
          )}
        </div>
        {open && (
          <SessionForm
            mode="edit"
            places={places}
            initial={{
              startedAt: s.startedAt,
              durationMin: Math.round((s.durationSec ?? 0) / 6) / 10,
              place: s.place ?? '',
              rating: s.rating,
              protection: s.protection,
              hisOrgasms: s.hisOrgasms,
              herOrgasms: s.herOrgasms,
              tags: s.tags,
              notes: s.notes ?? '',
            }}
            submitLabel="Save changes"
            error={error}
            pending={pending}
            onSubmit={async (v) => {
              const ok = await run(() =>
                updateSession(s.id, {
                  version: s.updatedAt,
                  startedAt: v.startedAt,
                  durationMin: v.durationMin,
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
          <Trash2 size={16} /> Delete session
        </button>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete for both of you?">
        <p className="mb-4 text-sm text-ink-2">This removes it from both your and your partner’s history. Can’t be undone.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>
            Keep
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
            Delete
          </button>
        </div>
      </Sheet>
    </>
  );
}
