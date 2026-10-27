'use client';
import { useT } from './I18nProvider';

import {ExperienceFields} from './ExperienceFields';
import { useState } from 'react';
import { Flame, MapPin, Minus, Navigation, Plus } from 'lucide-react';
import { HEAT, PROTECTION, TAGS } from '@/lib/content';
import { FormError } from './FormError';
import { KindPicker } from './KindPicker';
import type { SessionKind } from '@/lib/types';

export type SessionFormValues = {
  kind: SessionKind;
  startedAt: string; // ISO
  durationMin: number;
  breakMin: number;
  place: string;
  useLocation: boolean;
  useGps: boolean;
  rating: number | null;
  protection: string | null;
  hisOrgasms: number | null;
  herOrgasms: number | null;
  tags: string[];
  notes: string;
  hisRating:number|null;herRating:number|null;hisNotes:string;herNotes:string;
};

export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export { getGps } from '@/lib/gps';

export function SessionForm({
  mode,
  initial,
  places,
  submitLabel,
  onSubmit,
  error,
  pending,
  isHer=false,
  exactTiming,
}: {
  mode: 'finish' | 'past' | 'edit';
  initial?: Partial<SessionFormValues>;
  places: string[];
  submitLabel: string;
  onSubmit: (v: SessionFormValues) => void;
  error?: string | null;
  pending?: boolean;
  isHer?:boolean;
  exactTiming?:{durationSec:number;breakSec:number};
}) {
  const { t, f } = useT();
  const [v, setV] = useState<SessionFormValues>({
    kind: initial?.kind ?? 'intercourse',
    startedAt: initial?.startedAt ?? new Date(Date.now() - 30 * 60_000).toISOString(),
    durationMin: initial?.durationMin ?? 15,
    breakMin: initial?.breakMin ?? 0,
    place: initial?.place ?? '',
    useLocation: initial?.useLocation ?? false,
    useGps: false,
    rating: initial?.rating ?? null,
    protection: initial?.protection ?? null,
    hisOrgasms: initial?.hisOrgasms ?? null,
    herOrgasms: initial?.herOrgasms ?? null,
    tags: initial?.tags ?? [],
    notes: initial?.notes ?? '',
    hisRating:initial?.hisRating??null,herRating:initial?.herRating??null,hisNotes:initial?.hisNotes??'',herNotes:initial?.herNotes??'',
  });
  const set = <K extends keyof SessionFormValues>(k: K, val: SessionFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const base=initial;
  const sharedChanged=mode==='edit' && !!base && (v.kind!==base.kind || Date.parse(v.startedAt)!==Date.parse(base.startedAt!) || Math.round(v.durationMin*60)!==Math.round((base.durationMin??0)*60) || Math.round(v.breakMin*60)!==Math.round((base.breakMin??0)*60) || v.place!==(base.place??'') || v.protection!==(base.protection??null) || JSON.stringify([...v.tags].sort())!==JSON.stringify([...(base.tags??[])].sort()));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(mode==='edit' && exactTiming ? {...v,durationMin:v.durationMin===initial?.durationMin?exactTiming.durationSec/60:v.durationMin,breakMin:v.breakMin===initial?.breakMin?exactTiming.breakSec/60:v.breakMin}:v);
      }}
    >
      <KindPicker value={v.kind} onChange={(k) => set('kind', k)} />

      {mode !== 'finish' && (
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">{t('When did it go down?')}</label>
            <input
              type="datetime-local"
              className="input"
              value={toLocalInput(new Date(v.startedAt))}
              max={toLocalInput(new Date())}
              onChange={(e) => e.target.value && set('startedAt', new Date(e.target.value).toISOString())}
              required
            />
          </div>
          <div>
            <label className="label">{t('Active time · {n} min', { n: v.durationMin })}</label>
            <div className="flex items-center gap-2">
              <NumInput className="input w-24 text-center" value={v.durationMin} onChange={(n) => set('durationMin', n)} />
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {[3, 5, 10, 15, 20, 30, 45, 60, 90].map((m) => (
                  <button type="button" key={m} onClick={() => set('durationMin', m)} className={`chip shrink-0 ${v.durationMin === m ? 'chip-on' : ''}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">{t('Breaks · {n} min', { n: v.breakMin })}</label>
            <NumInput className="input w-24 text-center" value={v.breakMin} onChange={(n) => set('breakMin', n)} />
            <p className="mt-1 text-xs text-ink-3">{t('Total time = {n} min', { n: v.durationMin + v.breakMin })}</p>
          </div>
        </div>
      )}

      <div>
        <label className="label">{t('Protection')}</label>
        <div className="flex flex-wrap gap-2">
          {PROTECTION.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => set('protection', v.protection === p.key ? null : p.key)}
              className={`chip ${v.protection === p.key ? 'chip-on' : ''}`}
            >
              {p.emoji} {t(p.label)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">{t('What went down')}</label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const on = v.tags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                data-tag={tag}
                onClick={() => set('tags', on ? v.tags.filter((x) => x !== tag) : [...v.tags, tag])}
                className={`chip ${on ? 'chip-on' : ''}`}
              >
                {t(tag)}
              </button>
            );
          })}
        </div>
      </div>

      <ExperienceFields v={v} set={patch=>setV(s=>({...s,...patch}))} mode={mode} isHer={isHer}/>

      <div>
        <label className="label">{t('Where')}</label>
        <input className="input" placeholder={t('Bedroom, his car, hotel in Vegas…')} value={v.place} maxLength={60} onChange={(e) => set('place', e.target.value)} />
        {places.length > 0 && (
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
            {places.slice(0, 10).map((p) => (
              <button type="button" key={p} onClick={() => set('place', p)} className={`chip shrink-0 ${v.place === p ? 'chip-on' : ''}`}>
                <MapPin size={12} /> {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'past' && (
        <div className="space-y-2">
          <Toggle
            on={v.useLocation}
            onChange={(on) => setV((s) => ({ ...s, useLocation: on, useGps: on && s.useGps }))}
            icon={<MapPin size={16} />}
            title={t('We’re still there')}
            sub={t('Pin this session to your current location (IP)')}
          />
          {v.useLocation && (
            <Toggle on={v.useGps} onChange={(on) => set('useGps', on)} icon={<Navigation size={16} />} title={t('Use precise GPS')} sub={t('Asks for location permission')} />
          )}
        </div>
      )}


      <FormError error={error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? t('Saving…') : mode==='edit' ? sharedChanged?t('Send change for approval'):t('Save'):submitLabel}
      </button>
    </form>
  );
}

export function Stepper({ label, value, onChange, disabled = false }: { label: string; value: number | null; onChange: (n: number | null) => void; disabled?: boolean }) {
  const n = value ?? 0;
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <p className="mb-2 text-xs text-ink-3">{label}</p>
      <div className="flex items-center justify-between">
        <button type="button" disabled={disabled} className="rounded-full bg-surface p-2 active:scale-90 disabled:opacity-30" onClick={() => onChange(n > 0 ? n - 1 : null)} aria-label="Less">
          <Minus size={16} />
        </button>
        <span className="text-2xl font-bold tabular-nums">{value ?? '–'}</span>
        <button type="button" disabled={disabled} className="rounded-full bg-surface p-2 active:scale-90 disabled:opacity-30" onClick={() => onChange(Math.min(20, n + 1))} aria-label="More">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  icon,
  title,
  sub,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  icon?: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-left"
    >
      <span className="text-ink-2">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {sub && <span className="block text-xs text-ink-3">{sub}</span>}
      </span>
      <span className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-rose' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

/** Decimal minutes field that keeps what you type: no stray leading zero, and it can be emptied while typing. */
function NumInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className: string }) {
  const [text, setText] = useState(String(value));
  // Presets (the 15/30/60 chips) change the value from outside.
  if (Number(text || 0) !== value) setText(String(value));
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(raw)) return;
        setText(raw.replace(/^0+(?=\d)/, ''));
        onChange(Math.min(1440, Math.max(0, Number(raw) || 0)));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
