'use client';

import type { SessionKind } from '@/lib/types';
import { useT } from './I18nProvider';

export const KIND_META: Record<SessionKind, { label: string; emoji: string }> = {
  intercourse: { label: /*i18n*/ 'Intercourse', emoji: '🍆' },
  oral: { label: /*i18n*/ 'Oral', emoji: '👅' },
};

/** Two-way switch between intercourse and oral. */
export function KindPicker({ value, onChange, className = '', disabled=false }: { value: SessionKind; onChange: (k: SessionKind) => void; className?: string; disabled?:boolean }) {
  const { t } = useT();
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`} role="radiogroup">
      {(Object.keys(KIND_META) as SessionKind[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          disabled={disabled}
          onClick={() => onChange(k)}
          className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-semibold transition active:scale-95 ${
            value === k ? 'border-rose bg-rose/20 text-ink' : 'border-line bg-surface-2 text-ink-3'
          }`}
        >
          <span>{KIND_META[k].emoji}</span> {t(KIND_META[k].label)}
        </button>
      ))}
    </div>
  );
}

/** All / Intercourse / Oral filter chips. */
export function KindFilter({ value, onChange }: { value: 'all' | SessionKind; onChange: (k: 'all' | SessionKind) => void }) {
  const { t } = useT();
  const opts: ('all' | SessionKind)[] = ['all', 'intercourse', 'oral'];
  return (
    <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto py-1">
      {opts.map((k) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} className={`chip shrink-0 ${value === k ? 'chip-on' : ''}`}>
          {k === 'all' ? t('All') : `${KIND_META[k].emoji} ${t(KIND_META[k].label)}`}
        </button>
      ))}
    </div>
  );
}
