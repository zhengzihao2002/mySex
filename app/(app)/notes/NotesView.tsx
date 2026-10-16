'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { deleteNote, markNotesRead, sendNote } from '@/app/actions';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { NOTE_KINDS } from '@/lib/content';
import { dateTimeInTz } from '@/lib/tz';
import type { LoveNote } from '@/lib/types';

const PROMPTS: Record<LoveNote['kind'], string[]> = {
  note: ['Last night was 🔥', 'I can’t stop thinking about you', 'You looked so good today', 'Thank you for being you 🥰'],
  wish: ['Tonight I want you to take control', 'Lingerie night? I’ll pick 😏', 'Let’s try something new tonight', 'Shower together later?'],
  tease: ['Guess what I’m (not) wearing', 'Come home early 😈', 'I’m already wet thinking about tonight', 'Bedroom. 10 minutes. Don’t be late.'],
};

export function NotesView({ notes, meId, partnerName, partnerAvatar }: { notes: LoveNote[]; meId: string; partnerName: string; partnerAvatar: string }) {
  const { tz } = useTz();
  const [kind, setKind] = useState<LoveNote['kind']>('note');
  const [text, setText] = useState('');
  const { run, pending, error } = useRun();
  const bottom = useRef<HTMLDivElement>(null);
  const unread = notes.some((n) => n.fromUser !== meId && !n.readAt);

  useEffect(() => {
    if (unread) markNotesRead();
  }, [unread]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [notes.length]);

  const ordered = [...notes].reverse();

  return (
    <div className="flex min-h-[calc(100dvh-140px)] flex-col pt-2">
      <h1 className="font-display text-3xl font-bold">Dirty notes</h1>
      <p className="mb-4 text-sm text-ink-3">Just between you and {partnerName}.</p>

      <div className="flex-1 space-y-2 pb-4">
        {ordered.length === 0 && <p className="card text-center text-sm text-ink-2">No notes yet. Make the first move 😏</p>}
        {ordered.map((n) => {
          const mine = n.fromUser === meId;
          return (
            <div key={n.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
              {!mine && <span className="text-xl">{partnerAvatar}</span>}
              <div className={`max-w-[78%] ${mine ? 'items-end' : ''} flex flex-col`}>
                <div
                  className={`rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${
                    mine ? 'rounded-br-lg bg-gradient-to-br from-rose to-plum text-white' : 'rounded-bl-lg border border-line bg-surface-2'
                  } ${n.kind === 'tease' ? 'ring-1 ring-luteal/60' : n.kind === 'wish' ? 'ring-1 ring-ovulation/60' : ''}`}
                  onDoubleClick={() => mine && run(() => deleteNote(n.id))}
                >
                  {n.kind !== 'note' && <span className="mr-1">{NOTE_KINDS[n.kind].emoji}</span>}
                  {n.body}
                </div>
                <span className="mt-0.5 px-2 text-[10px] text-ink-3">
                  {dateTimeInTz(n.createdAt, tz)}
                  {mine && n.readAt ? ' · seen' : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+84px)] -mx-4 space-y-2 bg-bg/90 px-4 pt-2 pb-2 backdrop-blur-xl">
        <div className="flex gap-2">
          {(Object.keys(NOTE_KINDS) as LoveNote['kind'][]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>
              {NOTE_KINDS[k].emoji} {NOTE_KINDS[k].label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {PROMPTS[kind].map((p) => (
            <button key={p} onClick={() => setText(p)} className="chip shrink-0 text-xs">
              {p}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => sendNote(text, kind))) setText('');
          }}
        >
          <textarea
            className="input max-h-32 min-h-12 flex-1 resize-none py-3"
            rows={1}
            maxLength={1000}
            placeholder={kind === 'wish' ? 'Tonight I want…' : kind === 'tease' ? 'Make them blush…' : 'Say something sweet (or filthy)…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary h-12 w-12 rounded-full p-0" disabled={pending || !text.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        </form>
        {error && <p className="text-xs text-rose-2">{error}</p>}
      </div>
    </div>
  );
}
