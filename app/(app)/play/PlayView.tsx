'use client';

import { useState } from 'react';
import { Dice5, Lock, Shuffle, Sparkles } from 'lucide-react';
import { answerDesire } from '@/app/actions';
import { useRun } from '@/components/useRun';
import { DARES, DESIRES, TAGS } from '@/lib/content';

const ACTIONS = ['Kiss', 'Lick', 'Nibble', 'Massage', 'Suck', 'Tease', 'Blow on', 'Spank', 'Caress', 'Bite'];
const PARTS = ['Neck', 'Lips', 'Inner thighs', 'Ears', 'Chest', 'Back', 'Butt', 'Stomach', 'Feet', 'Your choice 😈'];
const TIMES = ['30 sec', '1 min', '2 min', 'until they beg'];
const POSITIONS = TAGS.slice(0, 7);

function pick<T>(list: readonly T[], not?: T) {
  let v = list[Math.floor(Math.random() * list.length)];
  if (list.length > 1) while (v === not) v = list[Math.floor(Math.random() * list.length)];
  return v;
}

export function PlayView({
  mine,
  matches,
  partnerAnswered,
  partnerName,
}: {
  mine: Record<string, 'yes' | 'maybe' | 'no'>;
  matches: { item: string; both: boolean }[];
  partnerAnswered: number;
  partnerName: string;
}) {
  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="font-display text-3xl font-bold">Play</h1>
        <p className="text-sm text-ink-3">Foreplay, gamified.</p>
      </div>
      <SexDice />
      <DareCard />
      <Desires mine={mine} matches={matches} partnerAnswered={partnerAnswered} partnerName={partnerName} />
    </div>
  );
}

function SexDice() {
  const [roll, setRoll] = useState({ a: 'Kiss', p: 'Neck', t: '1 min', pos: 'Missionary' });
  const [spinning, setSpinning] = useState(false);
  const go = () => {
    if (navigator.vibrate) navigator.vibrate(40);
    setSpinning(true);
    let n = 0;
    const id = setInterval(() => {
      setRoll((r) => ({ a: pick(ACTIONS, r.a), p: pick(PARTS, r.p), t: pick(TIMES, r.t), pos: pick(POSITIONS, r.pos) }));
      if (++n > 10) {
        clearInterval(id);
        setSpinning(false);
      }
    }, 70);
  };
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Sex dice 🎲</h2>
        <span className="text-xs text-ink-3">Then finish in…</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[roll.a, roll.p, roll.t].map((v, i) => (
          <div key={i} className={`flex h-20 items-center justify-center rounded-2xl border border-line bg-surface-2 px-1 text-sm font-bold transition ${spinning ? 'scale-95 rotate-3' : ''}`}>
            {v}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-ink-2">
        Position: <b className="text-ink">{roll.pos}</b>
      </p>
      <button className="btn-primary mt-3 w-full" onClick={go} disabled={spinning}>
        <Dice5 size={18} /> Roll
      </button>
    </section>
  );
}

function DareCard() {
  const [dare, setDare] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  return (
    <section className="card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-ovulation/30 blur-3xl" />
      <h2 className="mb-3 font-semibold">Tonight’s dare</h2>
      <div className={`flex min-h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-plum/40 to-ovulation/30 p-5 text-center text-lg leading-snug font-semibold transition duration-300 ${flip ? 'scale-95 opacity-0' : ''}`}>
        {dare ?? 'Tap below if you dare 😈'}
      </div>
      <button
        className="btn-ghost mt-3 w-full"
        onClick={() => {
          setFlip(true);
          setTimeout(() => {
            setDare((d) => pick(DARES, d ?? undefined));
            setFlip(false);
          }, 250);
        }}
      >
        <Shuffle size={16} /> {dare ? 'Another one' : 'Draw a dare'}
      </button>
    </section>
  );
}

function Desires({
  mine,
  matches,
  partnerAnswered,
  partnerName,
}: {
  mine: Record<string, 'yes' | 'maybe' | 'no'>;
  matches: { item: string; both: boolean }[];
  partnerAnswered: number;
  partnerName: string;
}) {
  const [local, setLocal] = useState(mine);
  const { run } = useRun();
  const total = DESIRES.reduce((a, g) => a + g.items.length, 0);
  const answered = Object.keys(local).length;

  const set = (item: string, a: 'yes' | 'maybe' | 'no') => {
    const next = local[item] === a ? null : a;
    setLocal((l) => {
      const copy = { ...l };
      if (next) copy[item] = next;
      else delete copy[item];
      return copy;
    });
    run(() => answerDesire(item, next));
  };

  return (
    <section className="space-y-3">
      <div className="card">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles size={18} className="text-rose-2" /> Yes · No · Maybe
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Answer privately. {partnerName} never sees your answers — you only see what you <b>both</b> want.
        </p>
        <div className="mt-3 flex justify-between text-xs text-ink-3">
          <span>
            You: {answered}/{total}
          </span>
          <span>
            {partnerName}: {partnerAnswered}/{total}
          </span>
        </div>
      </div>

      <div className="card border-rose/40">
        <h3 className="mb-2 font-semibold">It’s a match 🔥</h3>
        {matches.length ? (
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <span key={m.item} className={`chip ${m.both ? 'chip-on' : ''}`}>
                {m.both ? '💯' : '🤔'} {m.item}
              </span>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <Lock size={14} /> Matches unlock as you both answer.
          </p>
        )}
        {matches.length > 0 && <p className="mt-2 text-[11px] text-ink-3">💯 both said yes · 🤔 at least one maybe</p>}
      </div>

      {DESIRES.map((g) => (
        <details key={g.group} className="card" open={g.group === 'Warm-up'}>
          <summary className="cursor-pointer list-none font-semibold">
            {g.group} <span className="text-xs font-normal text-ink-3">· {g.items.filter((i) => local[i]).length}/{g.items.length}</span>
          </summary>
          <div className="mt-3 divide-y divide-line/50">
            {g.items.map((item) => (
              <div key={item} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm">{item}</span>
                <div className="flex shrink-0 gap-1">
                  {(['yes', 'maybe', 'no'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => set(item, a)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${
                        local[item] === a
                          ? a === 'yes'
                            ? 'bg-follicular text-white'
                            : a === 'maybe'
                              ? 'bg-luteal text-white'
                              : 'bg-line text-ink'
                          : 'bg-surface-2 text-ink-3'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
