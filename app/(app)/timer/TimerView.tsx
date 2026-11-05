'use client';
import { AnimatedValue } from '@/components/Motion';
import { SymbolIcon } from '@/components/SymbolIcon';
import {progression,sessionXp,type MissionRun} from '@/lib/progression';
import {TimerPrompts} from '@/components/TimerPrompts';
import { useT } from '@/components/I18nProvider';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {flushSync} from 'react-dom';
import {RecordingLayer,useRecordingDismissal} from '@/components/RecordingLayer';
import {RecordingDial} from '@/components/RecordingDial';
import {useRecordingClock} from '@/components/useRecordingClock';
import {recordingElapsed as elapsedSec} from '@/lib/recording-clock';
import {lockPageScroll} from '@/lib/page-scroll-lock';
import { ChevronDown, EyeOff, History, MapPin, Navigation, Pause, Play, Shuffle, Trash2 } from 'lucide-react';
import { discardActiveSession, finishSession, logPastSession, setPaused, startSession } from '@/app/actions';
import { useRecordingLocation } from '@/components/useRecordingLocation';
import { FormError } from '@/components/FormError';
import {type RevealTimes} from '@/components/ScoreBadge';
import {SavedSessionReveal} from '@/components/XpCelebration';
import {savedCelebration,type SaveCelebration} from '@/lib/session-rewards';
import { getGps, SessionForm, Toggle, type SessionFormValues } from '@/components/SessionForm';
import { Sheet } from '@/components/Sheet';
import { KIND_META, KindPicker } from '@/components/KindPicker';
import { useRun } from '@/components/useRun';
import { placeSuggestions, scoreSessions } from '@/lib/clientScore';
import { formatClock } from '@/lib/dates';
import { dayInTz } from '@/lib/tz';
import { useTz } from '@/components/TzProvider';
import type { SessionKind, SexSession } from '@/lib/types';

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
  missions=[],
  initialKind='intercourse',
}: {
  missions?:MissionRun[];
  initialKind?:SessionKind;
  sessions: SexSession[];
  names: Record<string, string>;
  meId: string;
}) {
  const active = sessions.find((s) => s.status === 'active') ?? null;
  const done = useMemo(() => sessions.filter((s) => s.status === 'done'), [sessions]);
  const places = useMemo(() => placeSuggestions(sessions), [sessions]);
  const [optimistic, setOptimistic] = useState<SexSession | null>(null);
  const [startError,setStartError]=useState<string|null>(null);
  const [celebration,setCelebration]=useState<SaveCelebration|null>(null);
  const { tz } = useTz();

  // The clock depends on Date.now(); render it only on the device to avoid hydration drift.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  useEffect(() => {
    if (active) setOptimistic(null);
  }, [active]);

  const current = active ?? optimistic;

  return (
    <>
      {current && !mounted ? (
        <div className="fixed inset-0 z-[45] bg-bg" />
      ) : current ? (
        <RecordingLayer entrance={!active?'fade':'slide'}><LiveTimer
          key="live-timer"
          session={current}
          missions={missions}
          sessions={sessions}
          pendingStart={!active}
          starterName={names[current.createdBy] ?? 'You'}
          isMine={current.createdBy === meId}
          places={places}
          onFinished={(values, durationSec, times, serverCelebration) => {
            const saved:SexSession={...current,...values,feelings:[],status:'done',durationSec,endedAt:new Date().toISOString()};
            const next=[...done.filter(s=>s.id!==current.id),saved];
            setCelebration(serverCelebration??savedCelebration(next,current.id,iso=>dayInTz(iso,tz))??null);
          }}
        /></RecordingLayer>
      ) : (
        <IdleTimer onSaved={setCelebration} initialKind={initialKind} places={places} done={done} startError={startError} onStart={(s) => {setStartError(null);setOptimistic(s);}} onStartFailed={(error) => {setOptimistic(null);setStartError(error);}} />
      )}
      {celebration&&<SavedSessionReveal celebration={celebration} onClose={()=>setCelebration(null)}/>}
    </>
  );
}

// ─────────────────────────────── idle ───────────────────────────────

function IdleTimer({
  onSaved,
  initialKind,
  places,
  done,
  onStart,
  onStartFailed,
  startError,
}: {
  onSaved:(saved:SaveCelebration)=>void;
  initialKind:SessionKind;
  places: string[];
  done: SexSession[];
  onStart: (s: SexSession) => void;
  onStartFailed: (error:string) => void;
  startError: string|null;
}) {
  const { t, f } = useT();
  const place = '';
  const [kind, setKind] = useState<SessionKind>(initialKind);
  const { useLocation, setUseLocation, useGps, setUseGps, ready: locationReady } = useRecordingLocation();
  const [pastOpen, setPastOpen] = useState(false);
  const start = useRun();
  const past = useRun();
  const { tz } = useTz();
  const scores = useMemo(() => scoreSessions(done, tz), [done, tz]);
  const last = done[0];

  const begin = async () => {
    if (navigator.vibrate) navigator.vibrate(30);
    let failure:string|null=null;
    const ok = await start.run(async () => {
      const gps = useLocation && useGps ? await getGps() : null;
      // The pending screen must commit before the asynchronous server action.
      flushSync(()=>onStart({
        id: 'pending',
        scoreVersion:3,
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
      }));
      const result=await startSession({ kind, place: place || null, useLocation, gps });
      if(!result.ok)failure=result.error;
      return result;
    });
    if (!ok) onStartFailed(failure??'Something went wrong. Try again.');
  };

  return (
    <div className="flex flex-col items-center overflow-x-clip pt-4">
      <p className="text-xs font-semibold tracking-[0.3em] text-ink-3 uppercase">{t('Live timer')}</p>
      <h1 className="font-display mt-1 text-3xl font-bold">{t('Ready when you are')}</h1>
      <KindPicker value={kind} onChange={setKind} disabled={start.pending} className="mt-4 w-full max-w-xs" />

      <button onClick={begin} disabled={start.pending || !locationReady} className="timer-start group relative my-10 flex h-56 w-56 items-center justify-center" aria-label="Start timer">
        {/* Start both waves in the loop so no delayed ring appears as a solid disk. */}
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-rose/30 opacity-0 [animation:ripple_2.4s_ease-out_infinite]" />
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-ovulation/25 opacity-0 [animation:ripple_2.4s_ease-out_-1.2s_infinite]" />
        <span className="absolute inset-3 rounded-full bg-gradient-to-br from-rose via-plum to-ovulation shadow-[0_0_80px_rgba(255,61,127,0.45)] transition group-active:scale-95" />
        <span className="relative flex flex-col items-center text-white">
          <svg viewBox="0 0 24 24" className="h-14 w-14 animate-beat fill-white">
            <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
          <span className="mt-2 text-lg font-bold tracking-wide">{start.pending ? t('Starting…') : t('Start the clock')}</span>
        </span>
      </button>

      <div className="w-full space-y-3" data-motion>
        <Toggle on={useLocation} onChange={setUseLocation} disabled={start.pending} icon={<MapPin size={16} />} title={t('Record location')} sub={t('Saves your IP & city so you can see where you did it')} />
        {useLocation && (
          <Toggle on={useGps} onChange={setUseGps} disabled={start.pending} icon={<Navigation size={16} />} title={t('Precise GPS pin')} sub={t('Asks for location permission')} />
        )}
        <FormError error={start.error??startError} />

        <button onClick={() => setPastOpen(true)} disabled={start.pending} className="btn-ghost w-full">
          <History size={16} /> {t('Forgot the timer? Log a past session')}
        </button>

        {last && (
          <p className="pt-2 text-center text-xs text-ink-3">
            {t('Last time:')} {f.prettyDate(dayInTz(last.startedAt, tz))} ·{' '}
            {f.formatDuration(last.durationSec ?? 0)} · {t('score')} {scores.get(last.id)?.total ?? '–'}
          </p>
        )}
      </div>

      <Sheet open={pastOpen} onClose={() => setPastOpen(false)} stableHeight title={t('Log a past session')}>
        <SessionForm
          mode="past"
          places={places}
          initial={{ kind, useLocation: false }}
          submitLabel={t('Save it 😈')}
          error={past.error}
          pending={past.pending}
          onSubmit={async (v) => {
            let saved:SaveCelebration|undefined;
            const ok = await past.run(async () => {
              const gps = v.useLocation && v.useGps ? await getGps() : null;
              const result=await logPastSession(toPayload(v,gps));
              if(result.ok)saved=result.celebration;
              return result;
            });
            if(ok){setPastOpen(false);if(saved)onSaved(saved);}
          }}
        />
      </Sheet>
    </div>
  );
}

export function toPayload(v: SessionFormValues, gps: { latitude: number; longitude: number } | null = null) {
  return {
    hisRating:v.hisRating,herRating:v.herRating,hisNotes:v.hisNotes,herNotes:v.herNotes,
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

function LiveTimer({
  session,
  missions,
  sessions,
  pendingStart,
  starterName,
  isMine,
  places,
  onFinished,
}: {
  session: SexSession;
  missions:MissionRun[];
  sessions:SexSession[];
  pendingStart: boolean;
  starterName: string;
  isMine: boolean;
  places: string[];
  onFinished: (values: Partial<SexSession>, durationSec: number, times: RevealTimes,celebration?:SaveCelebration) => void;
}) {
  const { t, f } = useT();
  const router = useRouter();
  const [pauseIntent,setPauseIntent]=useState<boolean|null>(null);
  const [clockReset,setClockReset]=useState(0);
  const localPauseAt=useRef<number|null>(null);
  const paused=pauseIntent??!!session.pausedAt;
  const optimisticPause=pauseIntent!==null&&pauseIntent!==!!session.pausedAt;
  const {seconds:secs,now}=useRecordingClock(session,{pending:pendingStart,paused,optimistic:optimisticPause,reset:clockReset});
  const breakNo=session.breaks.length;
  const pauseAt=session.pausedAt?Date.parse(session.pausedAt):localPauseAt.current;
  const breakSecs=paused&&pauseAt!=null?Math.max(0,(now-pauseAt)/1000):0;
  const totalBreak=session.pausedSec+breakSecs;
  useLayoutEffect(()=>lockPageScroll(),[]);
  useEffect(()=>{
    if(pauseIntent!==null&&pauseIntent===!!session.pausedAt)setPauseIntent(null);
  },[pauseIntent,session.pausedAt]);
  // The screen stays on automatically while a session is running (no toggle needed).
  useWakeLock(!paused);
  const [dim, setDim] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [promptOpen,setPromptOpen]=useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const setDismissal=useRecordingDismissal();
  const act = useRun();
  const finish = useRun();
  const frozenAt = useRef<number>(0);

  const minutes = secs / 60;
  const recordedSeconds=pendingStart?0:elapsedSec(session,now);
  const liveXp=sessionXp({...session,status:'done',durationSec:recordedSeconds});
  const mission=useMemo(()=>progression(sessions,missions).quests.find(q=>session.kind==='intercourse'&&!q.complete&&q.mission.path==='endurance'&&q.mission.rule==='session'),[sessions,missions,session.kind,session.startedAt]);
  const { tz } = useTz();
  const startedLabel = f.timeInTz(session.startedAt, tz);
  const where = session.place || [session.city, session.country].filter(Boolean).join(', ');

  const requestPause=async(next:boolean)=>{
    if(next)localPauseAt.current=Date.now();
    setPauseIntent(next);
    const ok=await act.run(()=>setPaused(session.id,next));
    if(!ok){setPauseIntent(null);setClockReset(n=>n+1);}
    return ok;
  };
  const openFinish = async () => {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    frozenAt.current = secs;
    if(!await requestPause(true))return;
    setFinishOpen(true);
  };

  return (
    <div className="timer-screen">
      {/* Ambient light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000" style={{opacity:paused ? 0.3 : 0.75}}>
        <div className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] animate-[drift_22s_linear_infinite] rounded-full bg-rose/25 blur-[100px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[70vh] w-[70vh] animate-[drift_28s_linear_infinite_reverse] rounded-full bg-ovulation/25 blur-[110px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-safe">
        <Link href="/home" className="rounded-full bg-surface-2/70 p-2.5 text-ink-2 backdrop-blur" aria-label="Minimize">
          <ChevronDown size={20} />
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-surface-2/70 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${paused ? 'bg-luteal' : 'animate-pulse bg-rose'}`} />
          <SymbolIcon value={KIND_META[session.kind].emoji} size={14}/> <AnimatedValue value={pendingStart ? t('Starting') : paused ? t('Paused') : t('Live')}/>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDim(true)} className="rounded-full bg-surface-2/70 p-2.5 text-ink-2 backdrop-blur" aria-label="Discreet mode">
            <EyeOff size={18} />
          </button>
        </div>
      </header>

      <main className="recording-main">
        <div className="recording-dial-slot">
          <RecordingDial seconds={secs} paused={paused} pending={pendingStart} caption={t(milestone(minutes))} breakNo={breakNo} breakSeconds={breakSecs} totalBreak={totalBreak}/>
        </div>
        <div className="recording-details">
          <div className="recording-ring-legend" aria-label={t('Timer rings')}><span><i className="bg-rose"/>{t('Seconds')}</span><span><i className="bg-ovulation"/>{t('Minutes')}</span></div>
          <div className="recording-origin text-xs text-ink-3">
            <span>{t('{name} started at {time}', { name: isMine ? t('You') : starterName, time: startedLabel })}</span>
            <span className="inline-flex items-center justify-center gap-1"><MapPin size={12}/>{where || (pendingStart?t('Starting…'):t('No recorded location'))}</span>
          </div>
          {session.kind==='intercourse'&&<div className="recording-xp rounded-2xl border border-line bg-surface/40 px-3 py-2 text-center text-xs text-ink-2">
            <span className="font-semibold text-rose-2">{t('On save')}: +{liveXp.total} XP</span>
            {mission&&<p className="mt-1">{t(mission.mission.title)} · {Math.min(mission.mission.minMinutes,Math.floor(recordedSeconds/60))}/{mission.mission.minMinutes} {t('min')} · {mission.mission.minPositions} {t('Positions')}</p>}
          </div>}
          {session.kind==='intercourse'&&<button type="button" className="recording-prompt-trigger btn-ghost" onClick={()=>setPromptOpen(true)} disabled={paused||pendingStart}><Shuffle size={16}/>{t('Discover a random position')}</button>}
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <FormError error={act.error} />
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={pendingStart || act.pending}
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
            onClick={() => requestPause(!paused)}
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
          <span className="text-4xl font-extralight text-white/20 tabular-nums"><AnimatedValue value={formatClock(secs)}/></span>
          <span className="mt-2 text-[10px] text-white/15">{t('tap to wake')}</span>
        </button>
      )}

      {promptOpen&&session.kind==='intercourse'&&<TimerPrompts onClose={()=>setPromptOpen(false)}/>}

      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title={t('Discard this unfinished recording?')}>
        <p className="mb-4 text-sm text-ink-2">{t('This removes the unfinished timer immediately. No saved session or partner request is created.')}</p>
        <FormError error={act.error} />
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDiscard(false)}>
            {t('Keep going')}
          </button>
          <button
            className="btn bg-menstrual text-bg"
            disabled={act.pending}
            onClick={async () => {
              setDismissal('discard');
              if (await act.run(() => discardActiveSession(session.id, session.updatedAt))) {
                setConfirmDiscard(false);
                router.push('/timer');
              }else setDismissal('minimize');
            }}
          >
            {t('Discard recording')}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        stableHeight
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
          recordedLocation={session}
          initial={{ place: session.place ?? '', kind: session.kind }}
          submitLabel={t('Save & see our score')}
          error={finish.error}
          pending={finish.pending}
          onSubmit={async (v) => {
            const values = {
              hisRating:v.hisRating,herRating:v.herRating,hisNotes:v.hisNotes,herNotes:v.herNotes,
              kind: session.kind,
              place: v.place || null,
              rating: v.rating,
              protection: v.protection,
              hisOrgasms: v.hisOrgasms,
              herOrgasms: v.herOrgasms,
              tags: v.tags,
              notes: v.notes || null,
            };
            let saved:SaveCelebration|undefined;
            const ok=await finish.run(async()=>{const result=await finishSession(session.id,values);if(result.ok)saved=result.celebration;return result;});
            if (ok) {
              setFinishOpen(false);
              const activeSec = Math.round(elapsedSec(session, Date.now()));
              const breaks = session.breaks.filter((b) => b.end);
              const heat=[v.hisRating,v.herRating].filter((n):n is number=>n!=null);
              onFinished({...values,rating:heat.length?heat.reduce((a,b)=>a+b,0)/heat.length:null}, activeSec, { startedAt: session.startedAt, activeSec, breakSec: session.pausedSec, breaks },saved);
            } else router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}
