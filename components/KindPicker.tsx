'use client';

import { useId } from 'react';
import type { SessionKind } from '@/lib/types';
import { useT } from './I18nProvider';
import { SymbolIcon } from './SymbolIcon';
import { SelectionPill } from './Motion';

export const KIND_META: Record<SessionKind, { label: string; emoji: string }> = {
  intercourse: { label: /*i18n*/ 'Intercourse', emoji: '🍆' },
  oral: { label: /*i18n*/ 'Oral', emoji: '👅' },
};

export function KindPicker({ value, onChange, className = '', disabled = false }: { value: SessionKind; onChange: (k: SessionKind) => void; className?: string; disabled?: boolean }) {
  const { t } = useT();
  const id = useId();
  return <div className={`selection-group grid grid-cols-2 gap-1 rounded-2xl border border-line bg-bg/40 p-1 ${className}`} role="radiogroup" aria-label={t('Type')}>
    {(Object.keys(KIND_META) as SessionKind[]).map(k => <button key={k} type="button" role="radio" aria-checked={value === k} disabled={disabled} onClick={() => onChange(k)} className={`selection-choice flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium disabled:opacity-50 ${value === k ? 'text-rose-2' : 'text-ink-3'}`}>
      {value === k && <SelectionPill id={id}/>}
      <SymbolIcon value={KIND_META[k].emoji} size={16}/><span>{t(KIND_META[k].label)}</span>
    </button>)}
  </div>;
}

export function KindFilter({ value, onChange }: { value: 'all' | SessionKind; onChange: (k: 'all' | SessionKind) => void }) {
  const { t } = useT();
  const id = useId();
  return <div className="no-scrollbar selection-group flex justify-center gap-2 overflow-x-auto py-1">
    {(['all', 'intercourse', 'oral'] as const).map(k => <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} className={`selection-choice chip shrink-0 ${value === k ? 'text-rose-2 border-rose/30' : ''}`}>
      {value === k && <SelectionPill id={id}/>}{k !== 'all' && <SymbolIcon value={KIND_META[k].emoji} size={15}/>}<span>{k === 'all' ? t('All') : t(KIND_META[k].label)}</span>
    </button>)}
  </div>;
}
