'use client';
import { useT } from '@/components/I18nProvider';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, EyeOff, History, MapPin, Navigation, Pause, Play, Trash2 } from 'lucide-react';
import { discardActiveSession, finishSession, logPastSession, setPaused, startSession } from '@/app/actions';
import { useRecordingLocation } from '@/components/useRecordingLocation';
import { LocationPin } from '@/components/LocationPin';
import { FormError } from '@/components/FormError';
import { ScoreReveal, type RevealTimes } from '@/components/ScoreBadge';
import { getGps, SessionForm, Toggle, type SessionFormValues } from '@/components/SessionForm';
import { Sheet } from '@/components/Sheet';
import { KIND_META, KindPicker } from '@/components/KindPicker';
import { useRun } from '@/components/useRun';
import { placeSuggestions, scoreSessions } from '@/lib/clientScore';
import { formatClock, formatDuration, prettyDate } from '@/lib/dates';
import { dayInTz, timeInTz } from '@/lib/tz';
import { useTz } from '@/components/TzProvider';
import type { Score } from '@/lib/score';
import type { SessionKind, SexSession } from '@/lib/types';

/** Elapsed seconds of a session, derived only from server timestamps — survives app quits. */
function elapsedSec(s: Pick<SexSession, 'startedAt' | 'pausedAt' | 'pausedSec'>, now: number) {
  const end = s.pausedAt ? new Date(s.pausedAt).getTime() : now;
  return Math.max(0, (end - new Date(s.startedAt).getTime()) / 1000 - s.pausedSec);
}

function milestone(min: number) {
  if (min < 2) return /*i18n*/ 'And we’re off 😏';
  if (min < 5) return /*i18n*/ 'Quickie territory ⚡';
  if (min < 10) return /*i18n*/ 'Warming up 🔥';
  if (min < 20) return /*i18n*/ 'Now we’re talking 😈';
  if (min < 30) return /*i18n*/ 'Getting steamy 💦';
  if (min < 45) return /*i18n*/ 'Marathon mode 🏃';
  if (min < 60) return /*i18n*/ 'Absolute legends 🏆';
  return /*i18n*/ 'Okay, show-offs 👑';
}

export function TimerView({
  sessions,
  names,
  meId,
}: {
  sessions: SexSession[];
  names: Record<string, string>;
  meId: string;
}) {
  const active = sessions.find((s) => s.status === 'active') ?? null;
  const done = useMemo(() => sessions.filter((s) => s.status === 'done'), [sessions]);
  const places = useMemo(() => placeSuggestions(sessions), [sessions]);
  const [optimistic, setOptimistic] = useState<SexSession | null>(null);
  const [reveal, setReveal] = useState<{ score: Score; times: RevealTimes } | null>(null);
  const { tz } = useTz();

  // The clock depends on Date.now(); render it only on the device to avoid hydration drift.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (active) setOptimistic(null);
  }, [active]);

  const current = active ?? optimistic;

  return (
    <>
      {current && !mounted ? (
        <div className="fixed inset-0 z-[45] bg-bg" />
      ) : current ? (
        <LiveTimer
          key={current.id}
          session={current}
          pendingStart={!active}
          starterName={names[current.createdBy] ?? 'You'}
          isMine={current.createdBy === meId}
          places={places}
          onFinished={(values, durationSec, times) => {
            const scores = scoreSessions([...done, { ...current, ...values, status: 'done', durationSec }], tz);
            const s = scores.get(current.id);
            if (s) setReveal({ score: s, times });
          }}
        />
      ) : (
        <IdleTimer places={places} done={done} onStart={(s) => setOptimistic(s)} onStartFailed={() => setOptimistic(null)} />
      )}
      {reveal && <ScoreReveal score={reveal.score} times={reveal.times} onClose={() => setReveal(null)} />}
    </>
  );
}

// ─────────────────────────────── idle ───────────────────────────────

function IdleTimer({
  places,
  done,
  onStart,
  onStartFailed,
}: {
  places: string[];
  done: SexSession[];
  onStart: (s: SexSession) => void;
  onStartFailed: () => void;
}) {
  const { t, f } = useT();
  const [place, setPlace] = useState('');
  const [kind, setKind] = useState<SessionKind>('intercourse');
  const { useLocation, setUseLocation, useGps, setUseGps, ready: locationReady } = useRecordingLocation();
  const [pastOpen, setPastOpen] = useState(false);
  const start = useRun();
  const past = useRun();
  const { tz } = useTz();
  const scores = useMemo(() => scoreSessions(done, tz), [done, tz]);
  const last = done[0];

  const begin = async () => {
    if (navigator.vibrate) navigator.vibrate(30);
    const ok = await start.run(async () => {
      const gps = useLocation && useGps ? await getGps() : null;
      onStart({
        id: 'pending',
        kind,
        createdBy: '',
        status: 'active',
        startedAt: new Date().toISOString(),
        endedAt: null,
        pausedAt: null,
        pausedSec: 0,
        durationSec: null,
        ip: null,
        city: null,
        region: null,
        country: null,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        geoSource: gps ? 'gps' : null,
        place: place || null,
        rating: null,
        protection: null,
        hisOrgasms: null,
        herOrgasms: null,
        tags: [],
        notes: null,
        updatedAt: new Date().toISOString(),
        breaks: [],
      });
      return startSession({ kind, place: place || null, useLocation, gps });
    });
    if (!ok) onStartFailed();
  };

  return (
    <div className="flex flex-col items-center pt-4">
      <p className="text-xs font-semibold tracking-[0.3em] text-ink-3 uppercase">{t('Live timer')}</p>
      <h1 className="font-display mt-1 text-3xl font-bold">{t('Ready when you are')}</h1>
      <KindPicker value={kind} onChange={setKind} className="mt-4 w-full max-w-xs" />

      <button onClick={begin} disabled={start.pending || !locationReady} className="group relative my-10 flex h-56 w-56 items-center justify-center" aria-label="Start timer">
        <span className="absolute inset-0 rounded-full bg-rose/30 [animation:ripple_2.4s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-ovulation/25 [animation:ripple_2.4s_ease-out_1.2s_infinite]" />
        <span className="absolute inset-3 rounded-full bg-gradient-to-br from-rose via-plum to-ovulation shadow-[0_0_80px_rgba(255,61,127,0.45)] transition group-active:scale-95" />
        <span className="relative flex flex-col items-center text-white">
          <svg viewBox="0 0 24 24" className="h-14 w-14 animate-beat fill-white">
            <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
          <span className="mt-2 text-lg font-bold tracking-wide">{start.pending ? t('Starting…') : t('Start the clock')}</span>
        </span>
      </button>

      <div className="w-full space-y-3">
        <div>
          <input className="input" placeholder={t('Where? (optional) — bedroom, shower, car…')} value={place} maxLength={60} onChange={(e) => setPlace(e.target.value)} />
          {places.length > 0 && (
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              {places.slice(0, 10).map((p) => (
                <button key={p} onClick={() => setPlace(p)} className={`chip shrink-0 ${place === p ? 'chip-on' : ''}`}>
                  <MapPin size={12} /> {p}
                </button>
              ))}
            </div>
          )}
        </div>
        <Toggle on={useLocation} onChange={setUseLocation} icon={<MapPin size={16} />} title={t('Record location')} sub={t('Saves your IP & city so you can see where you did it')} />
        {useLocation && (
          <Toggle on={useGps} onChange={setUseGps} icon={<Navigation size={16} />} title={t('Precise GPS pin')} sub={t('Uses your device position. Coordinates are sent to OpenStreetMap to find the area name.')} />
        )}
        <p className="text-xs text-ink-3">{t('Location choices are remembered in this browser. To avoid repeated permission prompts, allow ongoing location access in browser settings if available.')}</p>
        <FormError error={start.error} />

        <button onClick={() => setPastOpen(true)} className="btn-ghost w-full">
          <History size={16} /> {t('Forgot the timer? Log a past session')}
        </button>

        {last && (
          <p className="pt-2 text-center text-xs text-ink-3">
            {t('Last time:')} {f.prettyDate(dayInTz(last.startedAt, tz))} ·{' '}
            {f.formatDuration(last.durationSec ?? 0)} · {t('score')} {scores.get(last.id)?.total ?? '–'}
          </p>
        )}
      </div>

      <Sheet open={pastOpen} onClose={() => setPastOpen(false)} title={t('Log a past session')}>
        <SessionForm
          mode="past"
          places={places}
          initial={{ useLocation: false }}
          submitLabel={t('Save it 😈')}
          error={past.error}
          pending={past.pending}
          onSubmit={async (v) => {
            const ok = await past.run(async () => {
              const gps = v.useLocation && v.useGps ? await getGps() : null;
              return logPastSession(toPayload(v, gps));
            });
            if (ok) setPastOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}

export function toPayload(v: SessionFormValues, gps: { latitude: number; longitude: number } | null = null) {
  return {
    startedAt: v.startedAt,
    kind: v.kind,
    durationMin: v.durationMin,
    breakMin: v.breakMin,
    place: v.place || null,
    useLocation: v.useLocation,
    gps,
    rating: v.rating,
    protection: v.protection,
    hisOrgasms: v.hisOrgasms,
    herOrgasms: v.herOrgasms,
    tags: v.tags,
    notes: v.notes || null,
  };
}

// ─────────────────────────────── live ───────────────────────────────

function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // rAF stops while the app is backgrounded; snap back to real time on return.
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running]);
  return now;
}

function useWakeLock(enabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } }).wakeLock;
    setSupported(!!wl);
    if (!wl || !enabled) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await wl.request('screen');
        if (cancelled) return void sentinel.release();
        setLocked(true);
        sentinel.addEventListener('release', () => setLocked(false));
      } catch {
        setLocked(false);
      }
    };
    const onVis = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
  return { supported, locked };
}

const R_OUT = 132;
const R_IN = 112;
const C_OUT = 2 * Math.PI * R_OUT;
const C_IN = 2 * Math.PI * R_IN;

function LiveTimer({
  session,
  pendingStart,
  starterName,
  isMine,
  places,
  onFinished,
}: {
  session: SexSession;
  pendingStart: boolean;
  starterName: string;
  isMine: boolean;
  places: string[];
  onFinished: (values: Partial<SexSession>, durationSec: number, times: RevealTimes) => void;
}) {
  const { t, f } = useT();
  const router = useRouter();
  const paused = !!session.pausedAt;
  // Keep ticking while paused too, so the break clock runs.
  const now = useNow(true);
  const breakNo = session.breaks.length;
  const breakSecs = session.pausedAt ? Math.max(0, (now - new Date(session.pausedAt).getTime()) / 1000) : 0;
  const totalBreak = session.pausedSec + breakSecs;
  const secs = elapsedSec(session, now);
  // The screen stays on automatically while a session is running (no toggle needed).
  useWakeLock(!paused);
  const [dim, setDim] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const act = useRun();
  const finish = useRun();
  const frozenAt = useRef<number>(0);

  const minutes = secs / 60;
  const secFrac = (secs % 60) / 60;
  const minFrac = (minutes % 60) / 60;
  const stamina = Math.round(40 * (1 - Math.exp(-minutes / 15)));
  const headAngle = secFrac * 2 * Math.PI - Math.PI / 2;
  const { tz } = useTz();
  const startedLabel = f.timeInTz(session.startedAt, tz);
  const where = session.place || [session.city, session.country].filter(Boolean).join(', ');

  const openFinish = async () => {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    frozenAt.current = secs;
    // Freeze the clock first so filling in the details doesn't add minutes.
    // Always an explicit pause (never a toggle), so a stale screen can't resume a partner-paused clock.
    await act.run(() => setPaused(session.id, true));
    setFinishOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-bg">
      {/* Ambient light */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${paused ? 'opacity-30' : 'opacity-100'}`}>
        <div className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] animate-[drift_22s_linear_infinite] rounded-full bg-rose/25 blur-[100px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[70vh] w-[70vh] animate-[drift_28s_linear_infinite_reverse] rounded-full bg-ovulation/25 blur-[110px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-safe">
        <Link href="/home" className="rounded-full bg-surface-2/70 p-2.5 text-ink-2 backdrop-blur" aria-label="Minimize">
          <ChevronDown size={20} />
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-surface-2/70 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${paused ? 'bg-luteal' : 'animate-pulse bg-rose'}`} />
          {KIND_META[session.kind].emoji} {pendingStart ? t('Starting') : paused ? t('Paused') : t('Live')}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDim(true)} className="rounded-full bg-surface-2/70 p-2.5 text-ink-2 backdrop-blur" aria-label="Discreet mode">
            <EyeOff size={18} />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6">
        <div className="relative aspect-square w-full max-w-[340px]">
          {/* heartbeat ripples */}
          {!paused && (
            <>
              <span className="absolute inset-[18%] rounded-full border border-rose/40 [animation:ripple_2s_ease-out_infinite]" />
              <span className="absolute inset-[18%] rounded-full border border-ovulation/40 [animation:ripple_2s_ease-out_1s_infinite]" />
            </>
          )}
          <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff7aa8" />
                <stop offset="55%" stopColor="#ff3d7f" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* minute ticks */}
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
              const long = i % 5 === 0;
              const r1 = 146;
              const r2 = long ? 139 : 142;
              const lit = i / 60 <= secFrac;
              return (
                <line
                  key={i}
                  x1={150 + r1 * Math.cos(a)}
                  y1={150 + r1 * Math.sin(a)}
                  x2={150 + r2 * Math.cos(a)}
                  y2={150 + r2 * Math.sin(a)}
                  stroke={lit ? '#ff7aa8' : 'rgba(255,255,255,0.14)'}
                  strokeWidth={long ? 2 : 1}
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx="150" cy="150" r={R_OUT} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="150"
              cy="150"
              r={R_OUT}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${secFrac * C_OUT} ${C_OUT}`}
              transform="rotate(-90 150 150)"
              filter="url(#glow)"
            />
            <circle cx="150" cy="150" r={R_IN} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="150"
              cy="150"
              r={R_IN}
              fill="none"
              stroke="#7c3aed"
              strokeOpacity="0.85"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${minFrac * C_IN} ${C_IN}`}
              transform="rotate(-90 150 150)"
            />
            <circle cx={150 + R_OUT * Math.cos(headAngle)} cy={150 + R_OUT * Math.sin(headAngle)} r="7" fill="#fff" filter="url(#glow)" />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <svg viewBox="0 0 24 24" className={`mb-2 h-7 w-7 fill-rose ${paused ? 'opacity-40' : 'animate-beat'}`}>
              <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" />
            </svg>
            <span className={`text-[64px] leading-none font-extralight tracking-tight tabular-nums ${paused ? 'text-ink-2' : ''}`}>
              {formatClock(secs)}
            </span>
            <span className="mt-3 text-sm font-medium text-ink-2">
              {paused ? (
                <>
                  {t('Break #{n}', { n: Math.max(1, breakNo) })} · <span className="tabular-nums text-luteal">{formatClock(breakSecs)}</span>
                </>
              ) : (
                t(milestone(minutes))
              )}
            </span>
            {breakNo > 0 && (
              <span className="mt-1 text-[11px] text-ink-3 tabular-nums">
                {f.plural(breakNo, t('{n} break', { n: breakNo }), t('{n} breaks', { n: breakNo }))} · {t('{d} total', { d: f.formatDuration(totalBreak) })}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-ink-3">
          <span>
            {t('{name} started at {time}', { name: isMine ? t('You') : starterName, time: startedLabel })}
          </span>
          {where && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {where}
              </span>
            </>
          )}
        </div>

        <LocationPin location={session} />

        <div className="mt-4 w-full max-w-[300px]">
          <div className="mb-1 flex justify-between text-[11px] text-ink-3">
            <span>{t('Stamina points')}</span>
            <span className="tabular-nums">{stamina}/40</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-rose to-ovulation" style={{ width: `${(stamina / 40) * 100}%` }} />
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-lg px-6 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <FormError error={act.error} />
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={pendingStart}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2/80 text-ink-3 backdrop-blur disabled:opacity-40"
            aria-label="Discard"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={openFinish}
            disabled={pendingStart || act.pending}
            className="h-16 flex-1 rounded-full bg-gradient-to-r from-rose to-plum text-lg font-bold text-white shadow-[0_10px_40px_rgba(255,61,127,0.45)] transition active:scale-95 disabled:opacity-50"
          >
            {t('We’re done 💦')}
          </button>
          <button
            onClick={() => act.run(() => setPaused(session.id, !paused))}
            disabled={pendingStart || act.pending}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2/80 text-ink backdrop-blur disabled:opacity-40"
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>
      </footer>

      {dim && (
        <button className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black" onClick={() => setDim(false)}>
          <span className="text-4xl font-extralight text-white/20 tabular-nums">{formatClock(secs)}</span>
          <span className="mt-2 text-[10px] text-white/15">{t('tap to wake')}</span>
        </button>
      )}

      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title={t('Discard this unfinished recording?')}>
        <p className="mb-4 text-sm text-ink-2">{t('This removes the unfinished timer immediately. No saved session or partner request is created.')}</p>
        <FormError error={act.error} />
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDiscard(false)}>
            {t('Keep going')}
          </button>
          <button
            className="btn bg-menstrual text-white"
            disabled={act.pending}
            onClick={async () => {
              if (await act.run(() => discardActiveSession(session.id, session.updatedAt))) {
                setConfirmDiscard(false);
                router.push('/timer');
              }
            }}
          >
            {t('Discard recording')}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={
          <span>
            {formatClock(frozenAt.current || secs)} <span className="text-sm font-normal text-ink-3">· {t('spill the details')}</span>
          </span>
        }
      >
        <p className="mb-4 text-xs text-ink-3">{t('The clock is paused. Close this sheet and hit ▶ if you’re going for round two.')}</p>
        <SessionForm
          mode="finish"
          places={places}
          initial={{ place: session.place ?? '', kind: session.kind }}
          submitLabel={t('Save & see our score')}
          error={finish.error}
          pending={finish.pending}
          onSubmit={async (v) => {
            const values = {
              kind: v.kind,
              place: v.place || null,
              rating: v.rating,
              protection: v.protection,
              hisOrgasms: v.hisOrgasms,
              herOrgasms: v.herOrgasms,
              tags: v.tags,
              notes: v.notes || null,
            };
            const ok = await finish.run(() => finishSession(session.id, values));
            if (ok) {
              setFinishOpen(false);
              const activeSec = Math.round(elapsedSec(session, Date.now()));
              const breaks = session.breaks.filter((b) => b.end);
              onFinished(values, activeSec, { startedAt: session.startedAt, activeSec, breakSec: session.pausedSec, breaks });
            } else router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}
