'use client';

import { useState } from 'react';

export type Bar = { key: string; label: string; value: number; color?: string; detail?: string };

/**
 * Minimal single-series bar chart: thin rounded bars on a recessive baseline,
 * tap (or hover) a bar to read its exact value. Labels sit under each bar.
 */
export function Bars({
  data,
  height = 120,
  color = '#ff3d7f',
  format = (n: number) => String(n),
  avg,
}: {
  data: Bar[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  avg?: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value), avg ?? 0);
  const sel = data.find((d) => d.key === active);

  return (
    <div className="select-none">
      <div className="mb-1 h-5 text-center text-xs text-ink-2">
        {sel ? (
          <span>
            <b className="text-ink">{format(sel.value)}</b> · {sel.detail ?? sel.label}
          </span>
        ) : (
          <span className="text-ink-3">Tap a bar</span>
        )}
      </div>
      <div className="relative flex items-end gap-[2px] border-b border-line" style={{ height }} onMouseLeave={() => setActive(null)}>
        {avg != null && avg > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-3/60" style={{ bottom: `${(avg / max) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-ink-3">avg {format(Math.round(avg * 10) / 10)}</span>
          </div>
        )}
        {data.map((d) => (
          <button
            key={d.key}
            className="group relative flex h-full flex-1 items-end"
            onClick={() => setActive(active === d.key ? null : d.key)}
            onMouseEnter={() => setActive(d.key)}
            aria-label={`${d.label}: ${format(d.value)}`}
          >
            <span
              className="w-full rounded-t-[4px] transition-all"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 3 : 0,
                background: d.color ?? color,
                opacity: active && active !== d.key ? 0.4 : 1,
              }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center text-[10px] text-ink-3">
            {data.length > 12 && i % 2 ? '' : d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars with direct labels — for small categorical breakdowns. */
export function HBars({ data, format = (n: number) => String(n) }: { data: Bar[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.key}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink-2">{d.label}</span>
            <span className="tabular-nums text-ink-3">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? '#ff3d7f' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
