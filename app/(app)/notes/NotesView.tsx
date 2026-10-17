'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { clearNotes, deleteNote, editNote, markNotesRead, sendNote } from '@/app/actions';
import { Sheet } from '@/components/Sheet';
import { FormError } from '@/components/FormError';
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
  const [selected, setSelected] = useState<LoveNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const del = useRun();
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
                <button
                  type="button"
                  onClick={() => {
                    setSelected(n);
                    setConfirmDelete(false);
                    setEditing(null);
                  }}
                  className={`rounded-3xl text-left px-4 py-2.5 text-[15px] leading-snug ${
                    mine ? 'rounded-br-lg bg-gradient-to-br from-rose to-plum text-white' : 'rounded-bl-lg border border-line bg-surface-2'
                  } ${n.kind === 'tease' ? 'ring-1 ring-luteal/60' : n.kind === 'wish' ? 'ring-1 ring-ovulation/60' : ''}`}
                >
                  {n.kind !== 'note' && <span className="mr-1">{NOTE_KINDS[n.kind].emoji}</span>}
                  {n.body}
                </button>
                <span className="mt-0.5 px-2 text-[10px] text-ink-3">
                  {dateTimeInTz(n.createdAt, tz)}
                  {n.editedAt ? ' · edited' : ''}
                  {mine && n.readAt ? ' · seen' : ''}
                </span>
              </div>
            </div>
          );
        })}
        {ordered.length > 0 && (
          <button className="mx-auto block pt-2 text-xs text-ink-3" onClick={() => setConfirmClear(true)}>
            Clear all notes
          </button>
        )}
        <div ref={bottom} />
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Note">
        {selected && (
          <div className="space-y-3">
            <p className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">“{selected.body}”</p>
            {editing !== null ? (
              <>
                <textarea className="input min-h-24" maxLength={1000} value={editing} onChange={(e) => setEditing(e.target.value)} autoFocus />
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    disabled={del.pending || !editing.trim()}
                    onClick={async () => {
                      if (await del.run(() => editNote(selected.id, editing))) setSelected(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : !confirmDelete ? (
              <>
                {selected.fromUser === meId && (
                  <button className="btn-ghost w-full" onClick={() => setEditing(selected.body)}>
                    Edit
                  </button>
                )}
                <button className="btn w-full bg-menstrual text-white" onClick={() => setConfirmDelete(true)}>
                  Delete for both of us
                </button>
                <button
                  className="btn-ghost w-full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selected.body);
                    } catch {}
                    setSelected(null);
                  }}
                >
                  Copy text
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-2">Delete this note? It disappears for you and {partnerName}. This can’t be undone.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                  <button
                    className="btn bg-menstrual text-white"
                    disabled={del.pending}
                    onClick={async () => {
                      if (await del.run(() => deleteNote(selected.id))) setSelected(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
            <FormError error={del.error} />
          </div>
        )}
      </Sheet>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all notes?">
        <p className="mb-4 text-sm text-ink-2">Every note between you and {partnerName} is deleted for both of you. This can’t be undone.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirmClear(false)}>
            Cancel
          </button>
          <button
            className="btn bg-menstrual text-white"
            disabled={del.pending}
            onClick={async () => {
              if (await del.run(() => clearNotes())) setConfirmClear(false);
            }}
          >
            Clear all
          </button>
        </div>
      </Sheet>

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
