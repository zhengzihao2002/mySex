'use client';
import { useT } from '@/components/I18nProvider';

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
  const { t, f } = useT();
  const [tab, setTab] = useState<Tab>('sex');
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-3xl font-bold">{t('Insights')}</h1>
      <div className="grid grid-cols-3 rounded-2xl bg-surface-2 p-1 text-sm font-semibold">
        {(
          [
            ['sex', /*i18n*/ 'Sex 🔥'],
            ['cycle', /*i18n*/ 'Cycle 🌙'],
            ['places', /*i18n*/ 'Places 📍'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl py-2 transition ${tab === k ? 'bg-surface text-ink shadow' : 'text-ink-3'}`}>
            {t(label)}
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
  const { t, f } = useT();
  const { tz, today } = useTz();
  const model = useMemo(() => buildCycleModel(periods, defaults, today, 12), [periods, defaults, today]);
  if (!model) {
    return <div className="card text-sm text-ink-2">{isHer ? t('Log your period on the calendar to see cycle insights.') : t('No cycle data yet — {name} logs her period on the calendar.', { name: herName })}</div>;
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
        <Tile value={t('{n}d', { n: stats.avgCycle })} label={t('avg cycle')} />
        <Tile value={t('{n}d', { n: stats.avgPeriod })} label={t('avg period')} />
        <Tile value={t(stats.regularity)} label={`${t('regularity')}${stats.samples ? ` · ±${t('{n}d', { n: stats.cycleSd })}` : ''}`} small />
        <Tile value={t(stats.confidence)} label={`${t('prediction confidence')} · ±${t('{n}d', { n: stats.window })}`} small />
      </div>

      {current && (
        <section className="card">
          <h3 className="mb-3 font-semibold">{t('This cycle')}</h3>
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
                  <p className="text-ink-3">{f.prettyRange(s.start, s.end)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="mb-1 font-semibold">{t('Coming up')}</h3>
        <p className="mb-3 text-xs text-ink-3">{t('Predictions get sharper with every period logged. Not birth control!')}</p>
        <div className="divide-y divide-line/60">
          {upcoming.map((u, i) => (
            <div key={u.periodStart} className="grid grid-cols-[1fr_auto] gap-1 py-2.5 text-sm">
              <p className="font-semibold">
                <span className="text-menstrual">🩸</span> {f.prettyRange(u.periodStart, u.periodEnd)}
                {i === 0 && u.periodStart > today && <span className="ml-1 text-xs font-normal text-ink-3">{f.relativeDays(diffDays(u.periodStart, today))}</span>}
              </p>
              <p className="text-right text-xs text-ink-3">{u.cycle.predicted ? `±${t('{n}d', { n: stats.window })}` : t('logged')}</p>
              <p className="col-span-2 text-xs text-ink-2">
                🥚 {t('Ovulation')} {f.prettyDate(u.ovulation)} · {t('Fertile')} {f.prettyRange(u.fertileStart, u.fertileEnd)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {stats.cycleLengths.length > 0 && (
        <section className="card">
          <h3 className="mb-2 font-semibold">{t('Cycle lengths')}</h3>
          <Bars
            data={stats.cycleLengths.slice(-12).map((c) => ({ key: c.start, label: f.monthShort(Number(c.start.slice(5, 7))), value: c.length, detail: t('cycle from {date}', { date: f.prettyDate(c.start, { year: true }) }) }))}
            avg={stats.avgCycle}
            color={PHASES.follicular.color}
            format={(n) => t('{n}d', { n })}
          />
        </section>
      )}

      <section className="card">
        <h3 className="mb-3 font-semibold">{t('Sex by phase')}</h3>
        <HBars data={PHASE_ORDER.map((p) => ({ key: p, label: `${PHASES[p].emoji} ${t(PHASES[p].name)}`, value: sexByPhase.get(p) ?? 0, color: PHASES[p].color }))} />
        {libido.size > 0 && (
          <>
            <h3 className="mt-5 mb-3 font-semibold">{t('Her horniness by phase')}</h3>
            <HBars
              format={(n) => `${n.toFixed(1)}/5`}
              data={PHASE_ORDER.map((p) => {
                const v = libido.get(p) ?? [];
                return { key: p, label: `${PHASES[p].emoji} ${t(PHASES[p].name)}`, value: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0, color: PHASES[p].color };
              })}
            />
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="px-1 font-semibold">{t('Phase guide')}</h3>
        {PHASE_ORDER.map((p) => (
          <details key={p} className="card group" style={{ borderColor: PHASES[p].color + '55' }}>
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: PHASES[p].tint }}>
                {PHASES[p].emoji}
              </span>
              <span className="flex-1 font-semibold">{t(PHASES[p].name)}</span>
              <span className="text-ink-3 transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 space-y-2 text-sm text-ink-2">
              <p>{t(PHASES[p].blurb)}</p>
              <p>
                <b className="text-ink">{t('Hormones:')}</b> {t(PHASES[p].hormones)}
              </p>
              <p>
                <b className="text-ink">{t('Libido:')}</b> {t(PHASES[p].libido)}
              </p>
              <p>
                <b className="text-ink">{t('For her:')}</b> {t(PHASES[p].her)}
              </p>
              <p>
                <b className="text-ink">{t('For him:')}</b> {t(PHASES[p].him)}
              </p>
            </div>
          </details>
        ))}
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">{t('Period log')}</h3>
        <div className="divide-y divide-line/60 text-sm">
          {[...periods].reverse().map((p) => (
            <div key={p.id} className="flex justify-between py-2">
              <span>{p.end ? f.prettyRange(p.start, p.end) : `${f.prettyDate(p.start)} – ${t('ongoing')}`}</span>
              <span className="text-ink-3">{p.end ? t('{n} days', { n: diffDays(p.end, p.start) + 1 }) : ''}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────── sex ───────────────────────────────

function SexTab({ sessions, herName, hisName }: Parameters<typeof InsightsView>[0]) {
  const { t, f } = useT();
  const { tz, today } = useTz();
  const [showAll, setShowAll] = useState(false);
  const scores = useMemo(() => scoreSessions(sessions, tz), [sessions, tz]);
  const places = useMemo(() => placeSuggestions(sessions), [sessions]);
  const badges = useMemo(() => achievements(sessions, scores, tz, today), [sessions, scores, tz, today]);

  if (!sessions.length) {
    return (
      <div className="card text-center text-sm text-ink-2">
        {t('Nothing logged yet. Hit the ❤️ button and start the clock 😏')}
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
  const protection = PROTECTION.map((p) => ({ key: p.key, label: `${p.emoji} ${t(p.label)}`, value: sessions.filter((s) => s.protection === p.key).length })).filter((p) => p.value > 0);
  const tagCounts = new Map<string, number>();
  sessions.forEach((s) => s.tags.forEach((x) => tagCounts.set(x, (tagCounts.get(x) ?? 0) + 1)));
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const list = showAll ? sessions : sessions.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Tile value={sessions.length} label={t('sessions all-time')} />
        <Tile value={f.formatDuration(totalSec)} label={t('naked time together')} />
        <Tile value={f.formatDuration(avgSec)} label={t('average length')} />
        <Tile value={avgScore} label={t('average score')} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Highlight title={t('Best ever')} s={best} score={scores.get(best.id)} tz={tz} />
        <Highlight title={t('Longest')} s={longest} score={scores.get(longest.id)} tz={tz} />
      </div>

      <section className="card">
        <h3 className="mb-2 font-semibold">{t('Last 12 months')}</h3>
        <Bars
          data={months.map(({ y, m }) => {
            const key = `${y}-${String(m).padStart(2, '0')}`;
            return { key, label: f.lang === 'zh' ? String(m) : f.monthShort(m)[0], value: byMonth.get(key) ?? 0, detail: f.lang === 'zh' ? `${y}年${m}月` : `${f.monthShort(m)} ${y}` };
          })}
          format={(n) => t('{n}×', { n })}
        />
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">{t('Favourite days')}</h3>
        <Bars data={[0, 1, 2, 3, 4, 5, 6].map((i) => ({ key: String(i), label: f.weekdayShort(i), value: byWeekday[i], detail: f.weekdayShort(i) }))} height={90} format={(n) => t('{n}×', { n })} />
        <h3 className="mt-5 mb-3 font-semibold">{t('Time of day')}</h3>
        <HBars
          data={[/*i18n*/ '🌅 Morning', /*i18n*/ '☀️ Afternoon', /*i18n*/ '🌆 Evening', /*i18n*/ '🌙 After midnight'].map((l, i) => ({ key: l, label: t(l), value: byTime[i] }))}
          format={(n) => t('{n}×', { n })}
        />
      </section>

      <section className="card">
        <h3 className="mb-3 font-semibold">{t('Orgasm scoreboard')}</h3>
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
            {t('She finishes')} <b className="text-ink">{herRate}%</b> {t('of the time')}{herRate >= 80 ? t(' — well played 👏') : herRate < 50 ? t(' — room for improvement, sir 😉') : ''}
          </p>
        )}
      </section>

      {(protection.length > 0 || topTags.length > 0) && (
        <section className="card">
          {protection.length > 0 && (
            <>
              <h3 className="mb-3 font-semibold">{t('Protection')}</h3>
              <HBars data={protection} format={(n) => t('{n}×', { n })} />
            </>
          )}
          {topTags.length > 0 && (
            <>
              <h3 className="mt-5 mb-3 font-semibold">{t('Your go-to moves')}</h3>
              <HBars data={topTags.map(([tag, n]) => ({ key: tag, label: t(tag), value: n }))} format={(n) => t('{n}×', { n })} />
            </>
          )}
        </section>
      )}

      <section className="card">
        <h3 className="mb-1 font-semibold">{t('Achievements')}</h3>
        <p className="text-xs text-ink-3">
          {t('{a} of {b} unlocked', { a: badges.filter((b) => b.unlocked).length, b: badges.length })}
        </p>
        <BadgeGrid badges={badges} />
      </section>

      <section className="space-y-2">
        <h3 className="px-1 font-semibold">{t('History')}</h3>
        {list.map((s) => (
          <SessionCard key={s.id} s={s} score={scores.get(s.id)} places={places} byName={t('one of you')} showDate={f.prettyDate(dayInTz(s.startedAt, tz))} />
        ))}
        {!showAll && sessions.length > 10 && (
          <button className="btn-ghost w-full" onClick={() => setShowAll(true)}>
            {t('Show all {n}', { n: sessions.length })}
          </button>
        )}
      </section>
    </div>
  );
}

function BadgeGrid({ badges }: { badges: ReturnType<typeof achievements> }) {
  const { t, f } = useT();
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {badges.map((b) => (
        <div key={b.key} className={`flex flex-col items-center rounded-2xl p-2 text-center ${b.unlocked ? 'bg-rose/10' : 'opacity-35 grayscale'}`} title={t(b.desc)}>
          <span className="text-2xl">{b.emoji}</span>
          <span className="mt-1 text-[10px] leading-tight font-semibold">{t(b.title)}</span>
          <span className="text-[9px] leading-tight text-ink-3">{t(b.desc)}</span>
        </div>
      ))}
    </div>
  );
}

function Highlight({ title, s, score, tz }: { title: string; s: SexSession; score?: Score; tz: string }) {
  const { t, f } = useT();
  return (
    <div className="card flex items-center gap-3 p-3">
      {score && <ScoreBadge score={score} />}
      <div className="min-w-0">
        <p className="text-[10px] text-ink-3 uppercase">{title}</p>
        <p className="truncate text-sm font-semibold">{f.formatDuration(s.durationSec ?? 0)}</p>
        <p className="truncate text-[11px] text-ink-3">{f.prettyDate(dayInTz(s.startedAt, tz), { year: true })}</p>
      </div>
    </div>
  );
}

function Tile({ value, label, small }: { value: React.ReactNode; label: string; small?: boolean }) {
  const { t, f } = useT();
  return (
    <div className="card p-3">
      <p className={`${small ? 'text-lg capitalize' : 'text-2xl'} font-bold tabular-nums`}>{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

// ─────────────────────────────── places ───────────────────────────────

function PlacesTab({ sessions }: { sessions: SexSession[] }) {
  const { t, f } = useT();
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
        <Tile value={groups.filter(([k]) => k !== 'Unknown').length} label={t('places')} />
        <Tile value={cities.size} label={t('cities')} />
        <Tile value={countries.size} label={t('countries')} />
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
                <p className="truncate font-semibold">{name === 'Unknown' ? t('Unknown') : name}</p>
                <p className="truncate text-xs text-ink-3">
                  {t('{n}×', { n: list.length })} · {t('avg score')} {avg} · {t('last')} {f.prettyDate(lastDay)}
                  {name !== cityLine && cityLine ? ` · ${cityLine}` : ''}
                </p>
                <p className="truncate text-[11px] text-ink-3">
                  {t('{d} total', { d: f.formatDuration(list.reduce((a, s) => a + (s.durationSec ?? 0), 0)) })}
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
        {!groups.length && <p className="card text-sm text-ink-2">{t('Turn on “Record location” when you start the timer to build your map of conquests 🗺️')}</p>}
      </div>
    </div>
  );
}
