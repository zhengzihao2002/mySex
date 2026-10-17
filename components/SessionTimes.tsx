'use client';
import { useT } from './I18nProvider';

import { formatDuration } from '@/lib/dates';
import type { Break } from '@/lib/types';

/** Total / active / break breakdown with a timeline of active (rose) and break (amber) segments. */
export function SessionTimes({
  startedAt,
  activeSec,
  breakSec,
  breaks,
}: {
  startedAt: string;
  activeSec: number;
  breakSec: number;
  breaks: Break[];
}) {
  const { t, f } = useT();
  const closed = breaks.filter((b) => b.end);
  const total = activeSec + breakSec;
  const t0 = new Date(startedAt).getTime();
  const longest = closed.reduce((m, b) => Math.max(m, (new Date(b.end!).getTime() - new Date(b.start).getTime()) / 1000), 0);
  const count = closed.length || (breakSec > 0 ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t('Total')} value={f.formatDuration(total)} />
        <Stat label={t('Active')} value={f.formatDuration(activeSec)} accent />
        <Stat label={t('Breaks')} value={breakSec ? f.formatDuration(breakSec) : '–'} />
      </div>
      {total > 0 && (
        <div className="relative h-2 overflow-hidden rounded-full bg-rose/80" aria-hidden>
          {closed.map((b, i) => {
            const s = (new Date(b.start).getTime() - t0) / 1000;
            const e = (new Date(b.end!).getTime() - t0) / 1000;
            return (
              <span
                key={i}
                className="absolute inset-y-0 bg-luteal"
                style={{ left: `${(s / total) * 100}%`, width: `${Math.max(0.8, ((e - s) / total) * 100)}%` }}
              />
            );
          })}
        </div>
      )}
      {count > 0 && (
        <p className="text-center text-[11px] text-ink-3">
          {f.plural(count, t('{n} break', { n: count }), t('{n} breaks', { n: count }))}
          {longest > 0 ? ` · ${t('longest {d}', { d: f.formatDuration(longest) })}` : ''}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2">
      <p className={`text-base font-bold tabular-nums ${accent ? 'text-rose-2' : ''}`}>{value}</p>
      <p className="text-[10px] text-ink-3 uppercase">{label}</p>
    </div>
  );
}
