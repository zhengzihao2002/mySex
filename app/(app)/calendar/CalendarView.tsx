'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet, Heart, Plus, SmilePlus } from 'lucide-react';
import { deletePeriod, endPeriod, logPastSession, startPeriod, updatePeriod } from '@/app/actions';
import { CheckInSheet } from '@/components/CheckInSheet';
import { FormError } from '@/components/FormError';
import { SessionCard } from '@/components/SessionCard';
import { SessionForm } from '@/components/SessionForm';
import { Sheet } from '@/components/Sheet';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { toPayload } from '../timer/TimerView';
import { placeSuggestions, scoreSessions } from '@/lib/clientScore';
import { MOODS, PHASES, PREGNANCY_CHANCE } from '@/lib/content';
import { buildCycleModel, dayInfo, type CycleDefaults, type DayInfo } from '@/lib/cycle';
import { addDays, diffDays, fromDayNum, toDayNum } from '@/lib/dates';
import { useT } from '@/components/I18nProvider';
import { dayInTz } from '@/lib/tz';
import type { DailyLog, Period, Profile, SexSession } from '@/lib/types';

export function CalendarView({
  periods,
  sessions,
  logs,
  me,
  partner,
  defaults,
}: {
  periods: Period[];
  sessions: SexSession[];
  logs: DailyLog[];
  me: Profile;
  partner: Profile;
  defaults: CycleDefaults;
}) {
  const { tz, today } = useTz();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState(today);

  const model = useMemo(() => buildCycleModel(periods, defaults, today, 18), [periods, defaults, today]);
  const scores = useMemo(() => scoreSessions(sessions, tz), [sessions, tz]);
  const places = useMemo(() => placeSuggestions(sessions), [sessions]);
  const byDay = useMemo(() => {
    const map = new Map<string, SexSession[]>();
    for (const s of sessions) {
      const d = dayInTz(s.startedAt, tz);
      map.set(d, [...(map.get(d) ?? []), s]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    return map;
  }, [sessions, tz]);
  const logsByDay = useMemo(() => {
    const map = new Map<string, DailyLog[]>();
    for (const l of logs) map.set(l.date, [...(map.get(l.date) ?? []), l]);
    return map;
  }, [logs]);

  const first = `${cursor.y}-${String(cursor.m).padStart(2, '0')}-01`;
  const firstN = toDayNum(first);
  const weekday = new Date(firstN * 86_400_000).getUTCDay();
  const gridStart = firstN - weekday;
  const days = Array.from({ length: 42 }, (_, i) => fromDayNum(gridStart + i));
  const rows = days[35].slice(0, 7) === first.slice(0, 7) ? 6 : 5;

  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });

  const touch = useRef<number | null>(null);
  const { t, f } = useT();

  return (
    <div className="pt-2">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{f.monthName(cursor.m)}</h1>
          <p className="text-sm text-ink-3">{cursor.y}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="chip"
            onClick={() => {
              setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
              setSelected(today);
            }}
          >
            {t('Today')}
          </button>
          <button className="rounded-full bg-surface-2 p-2" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <button className="rounded-full bg-surface-2 p-2" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div
        className="card p-2"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 60) shift(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-ink-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => f.weekdayLetter(i)).map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.slice(0, rows * 7).map((d) => (
            <DayCell
              key={d}
              date={d}
              inMonth={d.slice(0, 7) === first.slice(0, 7)}
              info={model ? dayInfo(model, d) : null}
              sex={byDay.get(d)?.length ?? 0}
              isToday={d === today}
              isSelected={d === selected}
              onClick={() => setSelected(d)}
            />
          ))}
        </div>
      </div>

      <Legend />

      <DayPanel
        key={selected}
        date={selected}
        today={today}
        info={model ? dayInfo(model, selected) : null}
        sessions={byDay.get(selected) ?? []}
        scores={scores}
        places={places}
        logs={logsByDay.get(selected) ?? []}
        periods={periods}
        me={me}
        partner={partner}
        hasModel={!!model}
      />
    </div>
  );
}

function DayCell({
  date,
  inMonth,
  info,
  sex,
  isToday,
  isSelected,
  onClick,
}: {
  date: string;
  inMonth: boolean;
  info: DayInfo | null;
  sex: number;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const phase = info ? PHASES[info.phase] : null;
  const { t, f } = useT();
  return (
    <button
      onClick={onClick}
      className={`relative mx-0.5 flex aspect-[0.86] flex-col items-center justify-center rounded-2xl transition ${inMonth ? '' : 'opacity-35'} ${
        isSelected ? 'ring-2 ring-ink/80' : ''
      }`}
      style={{ background: phase && !info?.isPeriod ? phase.tint : undefined }}
      aria-label={`${f.prettyDate(date)}${info ? ', ' + t(phase!.name) : ''}${sex ? ` · ${sex} ♥` : ''}`}
    >
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
          info?.isPeriod ? 'bg-menstrual text-white' : ''
        } ${info?.isPredictedPeriod ? 'border-2 border-dashed border-menstrual' : ''} ${
          info?.isOvulation ? 'border-2 border-ovulation bg-ovulation/30' : ''
        } ${isToday && !info?.isPeriod ? 'bg-ink text-bg' : ''}`}
      >
        {Number(date.slice(8))}
      </span>
      <span className="mt-0.5 flex h-3 items-center gap-0.5">
        {sex > 0 && (
          <>
            <Heart size={10} className="fill-rose text-rose" />
            {sex > 1 && <span className="text-[9px] font-bold text-rose-2">{sex}</span>}
          </>
        )}
        {info?.isFertile && !info.isOvulation && sex === 0 && <span className="h-1 w-1 rounded-full bg-ovulation" />}
      </span>
    </button>
  );
}

function Legend() {
  const { t } = useT();
  const items: [React.ReactNode, string][] = [
    [<span key="p" className="h-3 w-3 rounded-full bg-menstrual" />, /*i18n*/ 'Period'],
    [<span key="pp" className="h-3 w-3 rounded-full border-2 border-dashed border-menstrual" />, /*i18n*/ 'Predicted'],
    [<span key="f" className="h-3 w-3 rounded-full" style={{ background: PHASES.follicular.tint, border: `1px solid ${PHASES.follicular.color}` }} />, /*i18n*/ 'Follicular'],
    [<span key="o" className="h-3 w-3 rounded-full border-2 border-ovulation bg-ovulation/30" />, /*i18n*/ 'Ovulation'],
    [<span key="fw" className="h-1.5 w-1.5 rounded-full bg-ovulation" />, /*i18n*/ 'Fertile'],
    [<span key="l" className="h-3 w-3 rounded-full" style={{ background: PHASES.luteal.tint, border: `1px solid ${PHASES.luteal.color}` }} />, /*i18n*/ 'Luteal'],
    [<Heart key="h" size={11} className="fill-rose text-rose" />, /*i18n*/ 'Sex'],
  ];
  return (
    <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-1 text-[11px] text-ink-3">
      {items.map(([icon, label]) => (
        <span key={label} className="flex shrink-0 items-center gap-1.5">
          {icon}
          {t(label)}
        </span>
      ))}
    </div>
  );
}

function DayPanel({
  date,
  today,
  info,
  sessions,
  scores,
  places,
  logs,
  periods,
  me,
  partner,
  hasModel,
}: {
  date: string;
  today: string;
  info: DayInfo | null;
  sessions: SexSession[];
  scores: ReturnType<typeof scoreSessions>;
  places: string[];
  logs: DailyLog[];
  periods: Period[];
  me: Profile;
  partner: Profile;
  hasModel: boolean;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [editPeriod, setEditPeriod] = useState<Period | null>(null);
  const add = useRun();
  const per = useRun();
  const isFuture = date > today;
  const phase = info ? PHASES[info.phase] : null;
  const myLog = logs.find((l) => l.userId === me.userId) ?? null;
  const partnerLog = logs.find((l) => l.userId === partner.userId) ?? null;
  const isHer = me.sex === 'female';
  const { t, f } = useT();

  // The logged period this day belongs to (or the open one just before it).
  const containing = periods.find((p) => p.start <= date && (p.end ? p.end >= date : diffDays(date, p.start) < 10));
  const openBefore = [...periods].reverse().find((p) => !p.end && p.start < date && diffDays(date, p.start) < 15);

  const defaultStart = () => {
    const [y, m, d] = date.split('-').map(Number);
    const t = new Date(y, m - 1, d, 22, 0);
    return (t.getTime() > Date.now() ? new Date(Date.now() - 20 * 60_000) : t).toISOString();
  };

  return (
    <section className="mt-5 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-ink-3 uppercase">
            {date === today ? t('Today') : date === addDays(today, -1) ? t('Yesterday') : date === addDays(today, 1) ? t('Tomorrow') : ''}
          </p>
          <h2 className="text-xl font-bold">{f.prettyDate(date, { weekday: true, year: true })}</h2>
        </div>
      </div>

      {info && phase ? (
        <div className="card" style={{ borderColor: phase.color + '66' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl" style={{ background: phase.tint }}>
              {phase.emoji}
            </span>
            <div className="flex-1">
              <p className="font-bold">
                {t('{phase} phase', { phase: t(phase.name) })}{info.predictedCycle || info.isPredictedPeriod ? <span className="ml-1 text-xs font-normal text-ink-3">({t('predicted')})</span> : null}
              </p>
              <p className="text-xs text-ink-3">
                {t('Cycle day {d} of {n}', { d: info.cycleDay, n: info.cycleLength })}
                {info.isOvulation ? ` · ${t('Ovulation day')} 🥚` : info.isFertile ? ` · ${t('Fertile window')}` : ''}
                {info.isPms ? ` · ${t('PMS zone')}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ink-3 uppercase">{t('Pregnancy risk')}</p>
              <p className="text-sm font-bold" style={{ color: PREGNANCY_CHANCE[info.pregnancyChance].color }}>
                {t(PREGNANCY_CHANCE[info.pregnancyChance].label)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-2">{t(phase.blurb)}</p>
          <p className="mt-2 text-sm">
            <span className="font-semibold text-rose-2">{isHer ? t('For you:') : t('Pro tip:')} </span>
            {isHer ? t(phase.her) : t(phase.him)}
          </p>
        </div>
      ) : (
        !hasModel && (
          <div className="card text-sm text-ink-2">
            {isHer ? t('Log when your period starts and mySex will predict your cycle, fertile days and PMS.') : t('Once {name} logs her period, her cycle shows up here.', { name: partner.name })}
          </div>
        )
      )}

      {isHer && !isFuture && (
        <div className="flex flex-wrap gap-2">
          {containing ? (
            <>
              {!containing.end && date >= containing.start && (
                <button className="btn-ghost flex-1" disabled={per.pending} onClick={() => per.run(() => endPeriod(date))}>
                  <Droplet size={16} /> {t('Period ended today')}
                </button>
              )}
              <button className="btn-ghost flex-1" onClick={() => setEditPeriod(containing)}>
                {t('Edit period')}
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost flex-1 border-menstrual/50" disabled={per.pending} onClick={() => per.run(() => startPeriod(date))}>
                <Droplet size={16} className="text-menstrual" /> {t('Period started')}
              </button>
              {openBefore && (
                <button className="btn-ghost flex-1" disabled={per.pending} onClick={() => per.run(() => endPeriod(date))}>
                  {t('Period ended')}
                </button>
              )}
            </>
          )}
        </div>
      )}
      <FormError error={per.error} />

      <div className="space-y-2">
        {sessions.map((s) => (
          <SessionCard key={s.id} s={s} score={scores.get(s.id)} places={places} byName={s.createdBy === me.userId ? 'you' : partner.name} />
        ))}
        {!isFuture && (
          <button className="btn-ghost w-full border-dashed" onClick={() => setLogOpen(true)}>
            <Plus size={16} /> {sessions.length ? t('Log another round') : t('We did it this day')}
          </button>
        )}
      </div>

      {!isFuture && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('Check-ins')}</p>
            <button className="chip" onClick={() => setCheckInOpen(true)}>
              <SmilePlus size={14} /> {myLog ? t('Edit mine') : t('Add mine')}
            </button>
          </div>
          <LogLine name={t('You')} log={myLog} />
          <LogLine name={partner.name} log={partnerLog} />
        </div>
      )}

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title={`${t('Log sex')} · ${f.prettyDate(date)}`}>
        {logOpen && (
          <SessionForm
            mode="past"
            places={places}
            initial={{ startedAt: defaultStart() }}
            submitLabel={t('Save it 😈')}
            error={add.error}
            pending={add.pending}
            onSubmit={async (v) => {
              if (await add.run(() => logPastSession(toPayload(v)))) setLogOpen(false);
            }}
          />
        )}
      </Sheet>

      <CheckInSheet open={checkInOpen} onClose={() => setCheckInOpen(false)} date={date} sex={me.sex!} existing={myLog} />
      <PeriodSheet period={editPeriod} onClose={() => setEditPeriod(null)} />
    </section>
  );
}

function LogLine({ name, log }: { name: string; log: DailyLog | null }) {
  const mood = MOODS.find((m) => m.key === log?.mood);
  const { t } = useT();
  if (!log) return <p className="py-1 text-sm text-ink-3">{name}: {t('no check-in')}</p>;
  return (
    <div className="py-1 text-sm">
      <span className="font-medium">{name}:</span> {mood ? `${mood.emoji} ${t(mood.label)}` : ''}
      {log.libido ? ` · ${t('horny')} ${log.libido}/5` : ''}
      {log.energy ? ` · ${t('energy')} ${log.energy}/5` : ''}
      {log.flow ? ` · ${t('flow')}: ${t(log.flow)}` : ''}
      {log.symptoms.length > 0 && <span className="block text-xs text-ink-3">{log.symptoms.map((x) => t(x)).join(', ')}</span>}
      {log.note && <span className="block text-xs text-ink-2 italic">“{log.note}”</span>}
    </div>
  );
}

function PeriodSheet({ period, onClose }: { period: Period | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Sheet open={!!period} onClose={onClose} title={t('Edit period')}>
      {period && <PeriodForm key={period.id} period={period} onClose={onClose} />}
    </Sheet>
  );
}

function PeriodForm({ period, onClose }: { period: Period; onClose: () => void }) {
  const [start, setStart] = useState(period.start);
  const [end, setEnd] = useState(period.end ?? '');
  const { run, pending, error } = useRun();
  const { t } = useT();
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => updatePeriod(period.id, start, end || null))) onClose();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('Started')}</label>
          <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('Ended')}</label>
          <input type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <FormError error={error} />
      <button className="btn-primary w-full" disabled={pending}>
        {t('Save')}
      </button>
      <button
        type="button"
        className="btn w-full text-menstrual"
        disabled={pending}
        onClick={async () => {
          if (await run(() => deletePeriod(period.id))) onClose();
        }}
      >
        {t('Delete this period')}
      </button>
    </form>
  );
}
