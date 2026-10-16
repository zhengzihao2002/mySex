'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Dice5, Flame, Settings, SmilePlus, Timer } from 'lucide-react';
import { sendNote } from '@/app/actions';
import { CheckInSheet } from '@/components/CheckInSheet';
import { ScoreBadge } from '@/components/ScoreBadge';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { scoreSessions } from '@/lib/clientScore';
import { MOODS, NOTE_KINDS, PHASES, PREGNANCY_CHANCE } from '@/lib/content';
import { buildCycleModel, dayInfo, findCycle, phaseSpans, upcomingCycles } from '@/lib/cycle';
import { diffDays, formatClock, formatDuration, prettyDate, prettyRange, relativeDays } from '@/lib/dates';
import { weeklyStreak } from '@/lib/stats';
import { dayInTz } from '@/lib/tz';
import type { CoupleContext, DailyLog, LoveNote, Period, SexSession } from '@/lib/types';

export function HomeView({
  ctx,
  periods,
  sessions,
  logs,
  notes,
}: {
  ctx: CoupleContext;
  periods: Period[];
  sessions: SexSession[];
  logs: DailyLog[];
  notes: LoveNote[];
}) {
  const { tz, today } = useTz();
  const { me, partner, couple, her } = ctx;
  const [checkIn, setCheckIn] = useState(false);
  const active = sessions.find((s) => s.status === 'active');
  const done = useMemo(() => sessions.filter((s) => s.status === 'done'), [sessions]);
  const scores = useMemo(() => scoreSessions(done, tz), [done, tz]);
  const model = useMemo(
    () => buildCycleModel(periods, { cycleLength: her.cycleLengthDefault, periodLength: her.periodLengthDefault }, today),
    [periods, her, today],
  );
  const info = model ? dayInfo(model, today) : null;

  const together = couple.anniversary ?? couple.createdAt.slice(0, 10);
  const daysTogether = diffDays(today, together) + 1;
  const sessionDays = done.map((s) => dayInTz(s.startedAt, tz));
  const thisMonth = sessionDays.filter((d) => d.slice(0, 7) === today.slice(0, 7)).length;
  const streak = weeklyStreak(sessionDays, today);
  const last = done[0];
  const daysSince = last ? diffDays(today, dayInTz(last.startedAt, tz)) : null;
  const myLog = logs.find((l) => l.userId === me.userId && l.date === today) ?? null;
  const partnerLog = logs.find((l) => l.userId === partner.userId && l.date === today) ?? null;
  const latestFromPartner = notes.find((n) => n.fromUser === partner.userId);

  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  const greeting = hour < 5 ? 'Up late,' : hour < 12 ? 'Morning,' : hour < 18 ? 'Hey' : 'Evening,';

  return (
    <div className="space-y-4 pt-2">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-bg bg-surface-2 text-2xl">{me.avatar}</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-bg bg-surface-2 text-2xl">{partner.avatar}</span>
          </div>
          <div>
            <p className="text-sm text-ink-3">
              {greeting} {me.name}
            </p>
            <p className="font-semibold">
              You & {partner.name} · <span className="text-rose-2">
                {daysTogether.toLocaleString()} day{daysTogether === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        </div>
        <Link href="/settings" className="rounded-full bg-surface-2 p-2.5 text-ink-2" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </header>

      {active && <LiveBanner session={active} />}

      <CycleCard model={model} info={info} today={today} isHer={me.sex === 'female'} herName={her.name} />

      <div className="grid grid-cols-4 gap-2">
        <Quick href="/timer" icon={<Timer size={22} />} label="Timer" accent />
        <Quick href="/calendar" icon={<CalendarPlus size={22} />} label="Log" />
        <Quick onClick={() => setCheckIn(true)} icon={<SmilePlus size={22} />} label="Check-in" />
        <Quick href="/play" icon={<Dice5 size={22} />} label="Play" />
      </div>

      <MoodCard me={me.name} myLog={myLog} partnerName={partner.name} partnerLog={partnerLog} onCheckIn={() => setCheckIn(true)} />

      <div className="grid grid-cols-3 gap-2">
        <Stat value={thisMonth} label="this month" />
        <Stat value={streak} label={`week streak${streak >= 4 ? ' 🔥' : ''}`} />
        <Stat value={daysSince == null ? '–' : daysSince} label={daysSince === 0 ? 'days since 😏' : 'days since'} />
      </div>

      {last && (
        <Link href="/insights" className="card flex items-center gap-3">
          {scores.get(last.id) && <ScoreBadge score={scores.get(last.id)!} size="md" />}
          <div className="flex-1">
            <p className="text-xs text-ink-3 uppercase">Last time</p>
            <p className="font-semibold">
              {relativeDays(-(daysSince ?? 0))[0].toUpperCase() + relativeDays(-(daysSince ?? 0)).slice(1)} · {formatDuration(last.durationSec ?? 0)}
            </p>
            <p className="text-xs text-ink-3">
              {scores.get(last.id)?.emoji} {scores.get(last.id)?.grade}
              {last.place ? ` · ${last.place}` : last.city ? ` · ${last.city}` : ''}
            </p>
          </div>
        </Link>
      )}

      <Link href="/notes" className="card block">
        <p className="mb-1 text-xs text-ink-3 uppercase">From {partner.name}</p>
        {latestFromPartner ? (
          <p className={`${latestFromPartner.readAt ? 'text-ink-2' : 'font-semibold'}`}>
            {NOTE_KINDS[latestFromPartner.kind].emoji} {latestFromPartner.body}
          </p>
        ) : (
          <p className="text-ink-3">No notes yet. Slide into their notes 💌</p>
        )}
      </Link>

      <Milestone together={together} today={today} anniversary={couple.anniversary} />

      <CheckInSheet open={checkIn} onClose={() => setCheckIn(false)} date={today} sex={me.sex!} existing={myLog} />
    </div>
  );
}

function LiveBanner({ session }: { session: SexSession }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = session.pausedAt ? new Date(session.pausedAt).getTime() : now;
  const secs = end == null ? 0 : (end - new Date(session.startedAt).getTime()) / 1000 - session.pausedSec;
  return (
    <Link href="/timer" className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-rose to-plum p-4 text-white shadow-lg shadow-rose/30">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
      </span>
      <span className="flex-1 font-semibold">{session.pausedAt ? 'Paused — round two?' : 'Live right now'}</span>
      <span className="font-mono text-xl tabular-nums">{now == null ? '--:--' : formatClock(secs)}</span>
    </Link>
  );
}

function CycleCard({
  model,
  info,
  today,
  isHer,
  herName,
}: {
  model: ReturnType<typeof buildCycleModel>;
  info: ReturnType<typeof dayInfo>;
  today: string;
  isHer: boolean;
  herName: string;
}) {
  if (!model || !info) {
    return (
      <Link href="/calendar" className="card block">
        <p className="text-xs text-ink-3 uppercase">Cycle</p>
        <p className="mt-1 font-semibold">{isHer ? 'Log your last period to unlock predictions 🩸' : `Waiting for ${herName} to log her period`}</p>
        <p className="mt-1 text-sm text-ink-3">mySex learns her cycle, predicts periods, fertile days and when she’s most in the mood.</p>
      </Link>
    );
  }
  const phase = PHASES[info.phase];
  const cycle = findCycle(model, today)!;
  const spans = phaseSpans(cycle);
  const next = upcomingCycles(model, 2).find((u) => u.periodStart > today);
  const toNext = next ? diffDays(next.periodStart, today) : null;
  const fertile = upcomingCycles(model, 2).find((u) => u.fertileEnd >= today);

  // Ring geometry: each phase is an arc; a dot marks today.
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const pos = (info.cycleDay - 0.5) / info.cycleLength;
  const angle = pos * 2 * Math.PI - Math.PI / 2;

  return (
    <Link href="/insights" className="card flex items-center gap-4" style={{ borderColor: phase.color + '55' }}>
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full">
          {spans.map((s) => {
            const len = (s.days / cycle.length) * C;
            const el = (
              <circle
                key={s.phase}
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke={PHASES[s.phase].color}
                strokeWidth="10"
                strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 64 64)"
                opacity={s.phase === info.phase ? 1 : 0.45}
              />
            );
            offset += len;
            return el;
          })}
          <circle cx={64 + R * Math.cos(angle)} cy={64 + R * Math.sin(angle)} r="7" fill="#fff" stroke="var(--color-bg)" strokeWidth="3" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-ink-3 uppercase">Day</span>
          <span className="text-3xl font-bold tabular-nums">{info.cycleDay}</span>
          <span className="text-[10px] text-ink-3">of {info.cycleLength}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-lg font-bold" style={{ color: phase.color === '#7c3aed' ? '#a78bfa' : undefined }}>
          {phase.emoji} {phase.name}
        </p>
        {model.daysLate > 0 ? (
          <p className="text-sm font-semibold text-menstrual">Period is {model.daysLate} day{model.daysLate > 1 ? 's' : ''} late</p>
        ) : info.isPeriod || info.isPredictedPeriod ? (
          <p className="text-sm">Period day {info.cycleDay}</p>
        ) : (
          toNext != null && (
            <p className="text-sm">
              Period <b>{relativeDays(toNext)}</b> <span className="text-ink-3">· {prettyDate(next!.periodStart)}</span>
            </p>
          )
        )}
        {fertile && (
          <p className="text-xs text-ink-2">
            {fertile.fertileStart <= today ? 'Fertile now' : 'Fertile'} · {prettyRange(fertile.fertileStart, fertile.fertileEnd)}
          </p>
        )}
        <p className="text-xs">
          <span className="text-ink-3">Pregnancy risk </span>
          <b style={{ color: PREGNANCY_CHANCE[info.pregnancyChance].color }}>{PREGNANCY_CHANCE[info.pregnancyChance].label}</b>
          <span className="text-ink-3"> · Libido </span>
          <span className="text-ink-2">{phase.libido.split(/[.—]/)[0]}</span>
        </p>
      </div>
    </Link>
  );
}

function Quick({ href, onClick, icon, label, accent }: { href?: string; onClick?: () => void; icon: React.ReactNode; label: string; accent?: boolean }) {
  const cls = `flex flex-col items-center gap-1.5 rounded-3xl border py-3 text-xs font-medium transition active:scale-95 ${
    accent ? 'border-rose/50 bg-rose/15 text-ink' : 'border-line/70 bg-surface/80 text-ink-2'
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {icon}
      {label}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

function MoodCard({
  me,
  myLog,
  partnerName,
  partnerLog,
  onCheckIn,
}: {
  me: string;
  myLog: DailyLog | null;
  partnerName: string;
  partnerLog: DailyLog | null;
  onCheckIn: () => void;
}) {
  const { run, pending, error } = useRun();
  const [sent, setSent] = useState(false);
  const mood = (l: DailyLog | null) => MOODS.find((m) => m.key === l?.mood);
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3 uppercase">Today’s vibe</p>
        <button className="text-xs font-semibold text-rose-2" onClick={onCheckIn}>
          {myLog ? 'Update' : 'Check in'}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {[
          [me, myLog],
          [partnerName, partnerLog],
        ].map(([name, log]) => (
          <div key={name as string} className="flex items-center gap-2">
            <span className="text-3xl">{mood(log as DailyLog | null)?.emoji ?? '·'}</span>
            <div>
              <p className="text-sm font-medium">{name as string}</p>
              <p className="text-xs text-ink-3">
                {log ? `${mood(log as DailyLog)?.label ?? 'Checked in'}${(log as DailyLog).libido ? ` · ${'🔥'.repeat((log as DailyLog).libido!)}` : ''}` : 'No check-in yet'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn mt-3 w-full border border-rose/40 bg-rose/10 text-rose-2"
        disabled={pending || sent}
        onClick={async () => {
          if (await run(() => sendNote(`${me} is in the mood. Get over here 😈`, 'tease'))) setSent(true);
        }}
      >
        <Flame size={16} /> {sent ? 'Signal sent 😏' : 'I’m in the mood'}
      </button>
      {error && <p className="mt-2 text-xs text-rose-2">{error}</p>}
    </div>
  );
}

function Milestone({ together, today, anniversary }: { together: string; today: string; anniversary: string | null }) {
  const days = diffDays(today, together) + 1;
  const nextHundred = Math.ceil((days + 1) / 100) * 100;
  const items: { label: string; inDays: number }[] = [{ label: `Day ${nextHundred.toLocaleString()} together`, inDays: nextHundred - days }];
  if (anniversary) {
    const [, m, d] = anniversary.split('-');
    let next = `${today.slice(0, 4)}-${m}-${d}`;
    if (next < today) next = `${Number(today.slice(0, 4)) + 1}-${m}-${d}`;
    const years = Number(next.slice(0, 4)) - Number(anniversary.slice(0, 4));
    if (years > 0) items.push({ label: `${years}-year anniversary 🥂`, inDays: diffDays(next, today) });
  }
  items.sort((a, b) => a.inDays - b.inDays);
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-xs text-ink-3 uppercase">Next milestone</p>
        <p className="font-semibold">{items[0].label}</p>
      </div>
      <p className="text-right text-sm text-rose-2">{relativeDays(items[0].inDays)}</p>
    </div>
  );
}
