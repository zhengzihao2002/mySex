'use client';
import { SelectionPill } from '@/components/Motion';
import { SymbolIcon } from '@/components/SymbolIcon';
import { useT } from '@/components/I18nProvider';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { clearNotes, deleteNote, editNote, markNotesRead, sendNote } from '@/app/actions';
import { Sheet } from '@/components/Sheet';
import { FormError } from '@/components/FormError';
import { useTz } from '@/components/TzProvider';
import { useRun } from '@/components/useRun';
import { NOTE_KINDS } from '@/lib/content';
import { lockPageScroll } from '@/lib/page-scroll-lock';
import type { LoveNote } from '@/lib/types';

// i18n:begin
const PROMPTS: Record<LoveNote['kind'], string[]> = {
  note: ['Last night was unforgettable', 'I can’t stop thinking about you', 'You looked so good today', 'Thank you for being you 🥰'],
  wish: ['Tonight I want you to take control', 'Lingerie night? I’ll pick 😏', 'Let’s try something new tonight', 'Shower together later?'],
  tease: ['Guess what I’m (not) wearing', 'Come home early 😈', 'I’m already wet thinking about tonight', 'Bedroom. 10 minutes. Don’t be late.'],
};
// i18n:end

export function NotesView({ notes, meId, partnerName, partnerAvatar }: { notes: LoveNote[]; meId: string; partnerName: string; partnerAvatar: string }) {
  const { t, f } = useT();
  const { tz } = useTz();
  const [kind, setKind] = useState<LoveNote['kind']>('note');
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<LoveNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const del = useRun();
  const { run, pending, error } = useRun();
  const page = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const unread = notes.some((n) => n.fromUser !== meId && !n.readAt);

  useLayoutEffect(() => {
    const node = page.current;
    const frame = node?.closest<HTMLElement>('.app-frame');
    if (!node || !frame) return;
    const unlock = lockPageScroll();
    const viewport = window.visualViewport;
    let layoutHeight = window.innerHeight;
    let layoutWidth = window.innerWidth;
    let animationFrame = 0;
    const resize = () => {
      const active = document.activeElement;
      const typing = active instanceof HTMLElement && node.contains(active) && active.matches('input,textarea,[contenteditable="true"]');
      if (layoutWidth !== window.innerWidth || !typing) {
        layoutWidth = window.innerWidth;
        layoutHeight = window.innerHeight;
      }
      const height = viewport?.height ?? window.innerHeight;
      frame.style.setProperty('--notes-height', `${height}px`);
      frame.style.setProperty('--notes-top', `${viewport?.offsetTop ?? 0}px`);
      node.dataset.keyboardOpen = String(typing && layoutHeight - height > 120);
    };
    const schedule = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(resize);
    };
    resize();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    node.addEventListener('focusin', schedule);
    node.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(animationFrame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      node.removeEventListener('focusin', schedule);
      node.removeEventListener('focusout', schedule);
      frame.style.removeProperty('--notes-height');
      frame.style.removeProperty('--notes-top');
      unlock();
    };
  }, []);

  useEffect(() => {
    if (unread) markNotesRead();
  }, [unread]);
  useEffect(() => {
    const list = thread.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: !scrolled.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    scrolled.current = true;
  }, [notes.length]);

  const ordered = [...notes].reverse();

  return (
    <div ref={page} className="notes-page">
      <header className="notes-header">
        <h1 className="font-display text-3xl font-bold">{t('Dirty notes')}</h1>
        <p className="mt-1 text-sm text-ink-3">{t('Just between you and {name}.', { name: partnerName })}</p>
      </header>

      <div ref={thread} className="notes-thread space-y-3" role="region" aria-label={t('Notes')} tabIndex={0} data-motion>
        {ordered.length === 0 && <p className="card text-center text-sm text-ink-2">{t('No notes yet. Make the first move 😏')}</p>}
        {ordered.map((n) => {
          const mine = n.fromUser === meId;
          return (
            <div key={n.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
              {!mine && <span className="text-xl"><SymbolIcon value={partnerAvatar} size={22}/></span>}
              <div className={`max-w-[78%] ${mine ? 'items-end' : ''} flex flex-col`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(n);
                    setConfirmDelete(false);
                    setEditing(null);
                  }}
                  className={`rounded-3xl text-left px-4 py-2.5 text-[15px] leading-snug ${
                    mine ? 'notes-bubble-own rounded-br-lg text-ink' : 'rounded-bl-lg border border-line bg-surface-2'
                  } ${n.kind === 'tease' ? 'ring-1 ring-luteal/60' : n.kind === 'wish' ? 'ring-1 ring-ovulation/60' : ''}`}
                >
                  {n.kind !== 'note' && <span className="mr-1"><SymbolIcon value={NOTE_KINDS[n.kind].emoji} size={15}/></span>}
                  {n.body}
                </button>
                <span className="mt-0.5 px-2 text-[10px] text-ink-3">
                  {f.dateTimeInTz(n.createdAt, tz)}
                  {n.editedAt ? ` · ${t('edited')}` : ''}
                  {mine && n.readAt ? ` · ${t('seen')}` : ''}
                </span>
              </div>
            </div>
          );
        })}
        {ordered.length > 0 && (
          <button className="mx-auto block pt-2 text-xs text-ink-3" onClick={() => setConfirmClear(true)}>
            {t('Clear all notes')}
          </button>
        )}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={t('Note')}>
        {selected && (
          <div className="space-y-3">
            <p className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">“{selected.body}”</p>
            {editing !== null ? (
              <>
                <textarea className="input min-h-24" maxLength={1000} value={editing} onChange={(e) => setEditing(e.target.value)} autoFocus />
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-ghost" onClick={() => setEditing(null)}>
                    {t('Cancel')}
                  </button>
                  <button
                    className="btn-primary"
                    disabled={del.pending || !editing.trim()}
                    onClick={async () => {
                      if (await del.run(() => editNote(selected.id, editing))) setSelected(null);
                    }}
                  >
                    {t('Save')}
                  </button>
                </div>
              </>
            ) : !confirmDelete ? (
              <>
                {selected.fromUser === meId && (
                  <button className="btn-ghost w-full" onClick={() => setEditing(selected.body)}>
                    {t('Edit')}
                  </button>
                )}
                <button className="btn w-full bg-menstrual text-bg" onClick={() => setConfirmDelete(true)}>
                  {t('Delete for both of us')}
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
                  {t('Copy text')}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-2">{t('Delete this note? It disappears for you and {name}. This can’t be undone.', { name: partnerName })}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                    {t('Keep')}
                  </button>
                  <button
                    className="btn bg-menstrual text-bg"
                    disabled={del.pending}
                    onClick={async () => {
                      if (await del.run(() => deleteNote(selected.id))) setSelected(null);
                    }}
                  >
                    {t('Delete')}
                  </button>
                </div>
              </>
            )}
            <FormError error={del.error} />
          </div>
        )}
      </Sheet>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title={t('Clear all notes?')}>
        <p className="mb-4 text-sm text-ink-2">{t('Every note between you and {name} is deleted for both of you. This can’t be undone.', { name: partnerName })}</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setConfirmClear(false)}>
            {t('Cancel')}
          </button>
          <button
            className="btn bg-menstrual text-bg"
            disabled={del.pending}
            onClick={async () => {
              if (await del.run(() => clearNotes())) setConfirmClear(false);
            }}
          >
            {t('Clear all')}
          </button>
        </div>
      </Sheet>

      <footer className="notes-composer space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(NOTE_KINDS) as LoveNote['kind'][]).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} title={t(NOTE_KINDS[k].label)} className={`selection-choice chip min-w-0 px-2 text-xs ${kind === k ? 'text-rose-2 border-rose/30' : ''}`}>
              {kind === k && <SelectionPill id="note-kind"/>}<SymbolIcon value={NOTE_KINDS[k].emoji} size={15}/><span className="truncate">{t(NOTE_KINDS[k].label)}</span>
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {PROMPTS[kind].map((p) => (
            <button key={p} onClick={() => setText(t(p))} className="chip shrink-0 text-xs">
              {t(p)}
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
            placeholder={kind === 'wish' ? t('Tonight I want…') : kind === 'tease' ? t('Make them blush…') : t('Say something sweet (or filthy)…')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary h-12 w-12 rounded-full p-0" disabled={pending || !text.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        </form>
        {error && <p className="text-xs text-rose-2">{t(error)}</p>}
      </footer>
    </div>
  );
}
