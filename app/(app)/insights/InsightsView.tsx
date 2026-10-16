'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { Bars, HBars } from '@/components/Bars';
import { ScoreBadge } from '@/components/ScoreBadge';
import { SessionCard } from '@/components/SessionCard';
import { useTz } from '@/components/TzProvider';
import { achievements } from '@/lib/achievements';
import type { Score } from '@/lib/score';
import { placeSuggestions, scoreSessions } from '@/lib/clientScore';
import { flagEmoji, PHASES, PROTECTION } from '@/lib/content';
import { buildCycleModel, dayInfo, findCycle, phaseSpans, upcomingCycles, type CycleDefaults, type Phase } from '@/lib/cycle';
import { diffDays, formatDuration, MONTHS, prettyDate, prettyRange, relativeDays, WEEKDAYS } from '@/lib/dates';
import { dayInTz, hourInTz } from '@/lib/tz';
import type { DailyLog, Period, SexSession } from '@/lib/types';

type Tab = 'cycle' | 'sex' | 'places';
const PHASE_ORDER: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

export function InsightsView(props: {
  periods: Period[];
  sessions: SexSession[];
  herLogs: DailyLog[];
  isHer: boolean;
  herName: string;
  hisName: string;
  defaults: CycleDefaults;
}) {
  const [tab, setTab] = useState<Tab>('sex');
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-3xl font-bold">Insights</h1>
      <div className="grid grid-cols-3 rounded-2xl bg-surface-2 p-1 text-sm font-semibold">
        {(
          [
            ['sex', 'Sex 🔥'],
            ['cycle', 'Cycle 🌙'],
            ['places', 'Places 📍'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl py-2 transition ${tab === k ? 'bg-surface text-ink shadow' : 'text-ink-3'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'cycle' && <CycleTab {...props} />}
      {tab === 'sex' && <SexTab {...props} />}
      {tab === 'places' && <PlacesTab sessions={props.sessions} />}
    </div>
  );
}

// ─────────────────────────────── cycle ───────────────────────────────

function CycleTab({ periods, sessions, herLogs, isHer, herName, defaults }: Parameters<typeof InsightsView>[0]) {
  const { tz, today } = useTz();
  const model = useMemo(() => buildCycleModel(periods, defaults, today, 12), [periods, defaults, today]);
  if (!model) {
    return <div className="card text-sm text-ink-2">{isHer ? 'Log your period on the calendar to see cycle insights.' : `No cycle data yet — ${herName} logs her period on the calendar.`}</div>;
  }
  const { stats } = model;
  const current = findCycle(model, today);
  const spans = current ? phaseSpans(current) : [];
  const upcoming = upcomingCycles(model, 6);

  // Libido & sex frequency per phase.
  const libido = new Map<Phase, number[]>();
  for (const l of herLogs) {
    const info = l.libido ? dayInfo(model, l.date) : null;
    if (info) libido.set(info.phase, [...(libido.get(info.phase) ?? []), l.libido!]);
  }
  const sexByPhase = new Map<Phase, number>();
  for (const s of sessions) {
    const info = dayInfo(model, dayInTz(s.startedAt, tz));
    if (info && !info.predictedCycle) sexByPhase.set(info.phase, (sexByPhase.get(info.phase) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Tile value={`${stats.avgCycle}d`} label="avg cycle" />
        <Tile value={`${stats.avgPeriod}d`} label="avg period" />
        <Tile value={stats.regularity} label={`regularity${stats.samples ? ` · ±${stats.cycleSd}d` : ''}`} small />
        <Tile value={stats.confidence} label={`prediction confidence · ±${stats.window}d`} small />
      </div>

      {current && (
        <section className="card">
          <h3 className="mb-3 font-semibold">This cycle</h3>
          <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
            {spans.map((s) => (
              <div key={s.phase} style={{ flex: s.days, background: PHASES[s.phase].color }} />
            ))}
          </div>
          <div className="relative h-3">
            <span
              className="absolute top-0 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[8px] border-x-transparent border-b-ink"
              style={{ left: `${((diffDays(today, current.start) + 0.5) / current.length) * 100}%` }}
            />
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
            {spans.map((s) => (
              <div key={s.phase} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PHASES[s.phase].color }} />
                <div>
                  <p className="font-semibold text-ink">
                    {PHASES[s.phase].name} · {s.days}d
                  </p>
                  <p className="text-ink-3">{prettyRange(s.start, s.end)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="mb-1 font-semibold">Coming up</h3>
        <p className="mb-3 text-xs text-ink-3">Predictions get sharper with every period logged. Not birth control!</p>
        <div className="divide-y divide-line/60">
          {upcoming.map((u, i) => (
            <div key={u.periodStart} className="grid grid-cols-[1fr_auto] gap-1 py-2.5 text-sm">
              <p className="font-semibold">
                <span className="text-menstrual">🩸</span> {prettyRange(u.periodStart, u.periodEnd)}
                {i === 0 && u.periodStart > today && <span className="ml-1 text-xs font-normal text-ink-3">{relativeDays(diffDays(u.periodStart, today))}</span>}
              </p>
              <p className="text-right text-xs text-ink-3">{u.cycle.predicted ? `±${stats.window}d` : 'logged'}</p>
              <p className="col-span-2 text-xs text-ink-2">
                🥚 Ovulation {prettyDate(u.ovulation)} · Fertile {prettyRange(u.fertileStart, u.fertileEnd)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {stats.cycleLengths.length > 0 && (
        <section className="card">
          <h3 className="mb-2 font-semibold">Cycle lengths</h3>
          <Bars
            data={stats.cycleLengths.slice(-12).map((c) => ({ key: c.start, label: prettyDate(c.start).split(' ')[0], value: c.length, detail: `cycle from ${prettyDate(c.start, { year: true })}` }))}
            avg={stats.avgCycle}
            color={PHASES.follicular.color}
            format={(n) => `${n}d`}
          />
        </section>
      )}

      <section className="card">
        <h3 className="mb-3 font-semibold">Sex by phase</h3>
        <HBars data={PHASE_ORDER.map((p) => ({ key: p, label: `${PHASES[p].emoji} ${PHASES[p].name}`, value: sexByPhase.get(p) ?? 0, color: PHASES[p].color }))} />
        {libido.size > 0 && (
          <>
            <h3 className="mt-5 mb-3 font-semibold">Her horniness by phase</h3>
            <HBars
              format={(n) => `${n.toFixed(1)}/5`}
              data={PHASE_ORDER.map((p) => {
                const v = libido.get(p) ?? [];
                return { key: p, label: `${PHASES[p].emoji} ${PHASES[p].name}`, value: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0, color: PHASES[p].color };
              })}
            />
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="px-1 font-semibold">Phase guide</h3>
        {PHASE_ORDER.map((p) => (
          <details key={p} className="card group" style={{ borderColor: PHASES[p].color + '55' }}>
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: PHASES[p].tint }}>
                {PHASES[p].emoji}
              </span>
              <span className="flex-1 font-semibold">{PHASES[p].name}</span>
              <span className="text-ink-3 transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 space-y-2 text-sm text-ink-2">
              <p>{PHASES[p].blurb}</p>
              <p>
                <b className="text-ink">Hormones:</b> {PHASES[p].hormones}
              </p>
              <p>
                <b className="text-ink">Libido:</b> {PHASES[p].libido}
              </p>
              <p>
                <b className="text-ink">For her:</b> {PHASES[p].her}
              </p>
              <p>
                <b className="text-ink">For him:</b> {PHASES[p].him}
              </p>
            </div>
          </details>
        ))}
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">Period log</h3>
        <div className="divide-y divide-line/60 text-sm">
          {[...periods].reverse().map((p) => (
            <div key={p.id} className="flex justify-between py-2">
              <span>{p.end ? prettyRange(p.start, p.end) : `${prettyDate(p.start)} – ongoing`}</span>
              <span className="text-ink-3">{p.end ? `${diffDays(p.end, p.start) + 1} days` : ''}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────── sex ───────────────────────────────

function SexTab({ sessions, herName, hisName }: Parameters<typeof InsightsView>[0]) {
  const { tz, today } = useTz();
  const [showAll, setShowAll] = useState(false);
  const scores = useMemo(() => scoreSessions(sessions, tz), [sessions, tz]);
  const places = useMemo(() => placeSuggestions(sessions), [sessions]);
  const badges = useMemo(() => achievements(sessions, scores, tz, today), [sessions, scores, tz, today]);

  if (!sessions.length) {
    return (
      <div className="card text-center text-sm text-ink-2">
        Nothing logged yet. Hit the ❤️ button and start the clock 😏
        <BadgeGrid badges={badges} />
      </div>
    );
  }

  const totalSec = sessions.reduce((a, s) => a + (s.durationSec ?? 0), 0);
  const avgSec = totalSec / sessions.length;
  const scoreVals = sessions.map((s) => scores.get(s.id)?.total ?? 0);
  const avgScore = Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length);
  const best = [...sessions].sort((a, b) => (scores.get(b.id)?.total ?? 0) - (scores.get(a.id)?.total ?? 0))[0];
  const longest = [...sessions].sort((a, b) => (b.durationSec ?? 0) - (a.durationSec ?? 0))[0];
  const herO = sessions.reduce((a, s) => a + (s.herOrgasms ?? 0), 0);
  const hisO = sessions.reduce((a, s) => a + (s.hisOrgasms ?? 0), 0);
  const herRateBase = sessions.filter((s) => s.herOrgasms != null);
  const herRate = herRateBase.length ? Math.round((herRateBase.filter((s) => (s.herOrgasms ?? 0) > 0).length / herRateBase.length) * 100) : null;

  // Last 12 months.
  const [ty, tm] = today.split('-').map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = ty * 12 + tm - 1 - (11 - i);
    return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
  });
  const byMonth = new Map<string, number>();
  const byWeekday = Array(7).fill(0);
  const byTime = [0, 0, 0, 0];
  for (const s of sessions) {
    const d = dayInTz(s.startedAt, tz);
    byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) ?? 0) + 1);
    const [y, m, dd] = d.split('-').map(Number);
    byWeekday[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]++;
    const h = hourInTz(s.startedAt, tz);
    byTime[h < 5 ? 3 : h < 12 ? 0 : h < 18 ? 1 : 2]++;
  }
  const protection = PROTECTION.map((p) => ({ key: p.key, label: `${p.emoji} ${p.label}`, value: sessions.filter((s) => s.protection === p.key).length })).filter((p) => p.value > 0);
  const tagCounts = new Map<string, number>();
  sessions.forEach((s) => s.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const list = showAll ? sessions : sessions.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Tile value={sessions.length} label="sessions all-time" />
        <Tile value={formatDuration(totalSec)} label="naked time together" />
        <Tile value={formatDuration(avgSec)} label="average length" />
        <Tile value={avgScore} label="average score" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Highlight title="Best ever" s={best} score={scores.get(best.id)} tz={tz} />
        <Highlight title="Longest" s={longest} score={scores.get(longest.id)} tz={tz} />
      </div>

      <section className="card">
        <h3 className="mb-2 font-semibold">Last 12 months</h3>
        <Bars
          data={months.map(({ y, m }) => {
            const key = `${y}-${String(m).padStart(2, '0')}`;
            return { key, label: MONTHS[m - 1][0], value: byMonth.get(key) ?? 0, detail: `${MONTHS[m - 1]} ${y}` };
          })}
          format={(n) => `${n}×`}
        />
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">Favourite days</h3>
        <Bars data={WEEKDAYS.map((w, i) => ({ key: w, label: w, value: byWeekday[i], detail: `${w}days` }))} height={90} format={(n) => `${n}×`} />
        <h3 className="mt-5 mb-3 font-semibold">Time of day</h3>
        <HBars
          data={['🌅 Morning', '☀️ Afternoon', '🌆 Evening', '🌙 After midnight'].map((l, i) => ({ key: l, label: l, value: byTime[i] }))}
          format={(n) => `${n}×`}
        />
      </section>

      <section className="card">
        <h3 className="mb-3 font-semibold">Orgasm scoreboard</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="text-3xl font-bold">{herO}</p>
            <p className="text-xs text-ink-3">{herName} 💦</p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="text-3xl font-bold">{hisO}</p>
            <p className="text-xs text-ink-3">{hisName} 🍆</p>
          </div>
        </div>
        {herRate != null && (
          <p className="mt-3 text-center text-sm text-ink-2">
            She finishes <b className="text-ink">{herRate}%</b> of the time{herRate >= 80 ? ' — well played 👏' : herRate < 50 ? ' — room for improvement, sir 😉' : ''}
          </p>
        )}
      </section>

      {(protection.length > 0 || topTags.length > 0) && (
        <section className="card">
          {protection.length > 0 && (
            <>
              <h3 className="mb-3 font-semibold">Protection</h3>
              <HBars data={protection} format={(n) => `${n}×`} />
            </>
          )}
          {topTags.length > 0 && (
            <>
              <h3 className="mt-5 mb-3 font-semibold">Your go-to moves</h3>
              <HBars data={topTags.map(([t, n]) => ({ key: t, label: t, value: n }))} format={(n) => `${n}×`} />
            </>
          )}
        </section>
      )}

      <section className="card">
        <h3 className="mb-1 font-semibold">Achievements</h3>
        <p className="text-xs text-ink-3">
          {badges.filter((b) => b.unlocked).length} of {badges.length} unlocked
        </p>
        <BadgeGrid badges={badges} />
      </section>

      <section className="space-y-2">
        <h3 className="px-1 font-semibold">History</h3>
        {list.map((s) => (
          <SessionCard key={s.id} s={s} score={scores.get(s.id)} places={places} byName="one of you" showDate={prettyDate(dayInTz(s.startedAt, tz))} />
        ))}
        {!showAll && sessions.length > 10 && (
          <button className="btn-ghost w-full" onClick={() => setShowAll(true)}>
            Show all {sessions.length}
          </button>
        )}
      </section>
    </div>
  );
}

function BadgeGrid({ badges }: { badges: ReturnType<typeof achievements> }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {badges.map((b) => (
        <div key={b.key} className={`flex flex-col items-center rounded-2xl p-2 text-center ${b.unlocked ? 'bg-rose/10' : 'opacity-35 grayscale'}`} title={b.desc}>
          <span className="text-2xl">{b.emoji}</span>
          <span className="mt-1 text-[10px] leading-tight font-semibold">{b.title}</span>
          <span className="text-[9px] leading-tight text-ink-3">{b.desc}</span>
        </div>
      ))}
    </div>
  );
}

function Highlight({ title, s, score, tz }: { title: string; s: SexSession; score?: Score; tz: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      {score && <ScoreBadge score={score} />}
      <div className="min-w-0">
        <p className="text-[10px] text-ink-3 uppercase">{title}</p>
        <p className="truncate text-sm font-semibold">{formatDuration(s.durationSec ?? 0)}</p>
        <p className="truncate text-[11px] text-ink-3">{prettyDate(dayInTz(s.startedAt, tz), { year: true })}</p>
      </div>
    </div>
  );
}

function Tile({ value, label, small }: { value: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div className="card p-3">
      <p className={`${small ? 'text-lg capitalize' : 'text-2xl'} font-bold tabular-nums`}>{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

// ─────────────────────────────── places ───────────────────────────────

function PlacesTab({ sessions }: { sessions: SexSession[] }) {
  const { tz } = useTz();
  const scores = useMemo(() => scoreSessions(sessions, tz), [sessions, tz]);
  const groups = useMemo(() => {
    const map = new Map<string, SexSession[]>();
    for (const s of sessions) {
      const key = s.place || [s.city, s.region].filter(Boolean).join(', ') || 'Unknown';
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [sessions]);
  const cities = new Set(sessions.map((s) => s.city).filter(Boolean));
  const countries = new Set(sessions.map((s) => s.country).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile value={groups.filter(([k]) => k !== 'Unknown').length} label="places" />
        <Tile value={cities.size} label="cities" />
        <Tile value={countries.size} label="countries" />
      </div>
      {countries.size > 0 && <p className="text-center text-3xl tracking-widest">{[...countries].map((c) => flagEmoji(c)).join(' ')}</p>}
      <div className="space-y-2">
        {groups.map(([name, list]) => {
          const geo = list.find((s) => s.latitude != null && s.longitude != null);
          const avg = Math.round(list.reduce((a, s) => a + (scores.get(s.id)?.total ?? 0), 0) / list.length);
          const lastDay = dayInTz(list[0].startedAt, tz);
          const cityLine = [list[0].city, list[0].region, list[0].country].filter(Boolean).join(', ');
          return (
            <div key={name} className="card flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-xl">{flagEmoji(list[0].country)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{name}</p>
                <p className="truncate text-xs text-ink-3">
                  {list.length}× · avg score {avg} · last {prettyDate(lastDay)}
                  {name !== cityLine && cityLine ? ` · ${cityLine}` : ''}
                </p>
                <p className="truncate text-[11px] text-ink-3">
                  {formatDuration(list.reduce((a, s) => a + (s.durationSec ?? 0), 0))} total
                  {list[0].ip ? ` · IP ${list[0].ip}` : ''}
                </p>
              </div>
              {geo ? (
                <a
                  href={`https://maps.apple.com/?ll=${geo.latitude},${geo.longitude}&q=${encodeURIComponent(name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-surface-2 p-2.5 text-rose-2"
                  aria-label="Open in Maps"
                >
                  <ExternalLink size={16} />
                </a>
              ) : (
                <MapPin size={16} className="text-ink-3" />
              )}
            </div>
          );
        })}
        {!groups.length && <p className="card text-sm text-ink-2">Turn on “Record location” when you start the timer to build your map of conquests 🗺️</p>}
      </div>
    </div>
  );
}
