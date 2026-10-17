'use client';
import { useT } from './I18nProvider';

import { useState } from 'react';
import { deleteDailyLog, saveDailyLog } from '@/app/actions';
import { FLOWS, MOODS, SYMPTOMS } from '@/lib/content';
import { prettyDate } from '@/lib/dates';
import type { DailyLog, Sex } from '@/lib/types';
import { FormError } from './FormError';
import { Sheet } from './Sheet';
import { useRun } from './useRun';

export function CheckInSheet({
  open,
  onClose,
  date,
  sex,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  sex: Sex;
  existing: DailyLog | null;
}) {
  const { t, f: fmt } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={`${t('Check-in')} · ${fmt.prettyDate(date, { weekday: true })}`}>
      {open && <CheckInForm key={date} date={date} sex={sex} existing={existing} onDone={onClose} />}
    </Sheet>
  );
}

function CheckInForm({ date, sex, existing, onDone }: { date: string; sex: Sex; existing: DailyLog | null; onDone: () => void }) {
  const { t } = useT();
  const [mood, setMood] = useState(existing?.mood ?? null);
  const [libido, setLibido] = useState(existing?.libido ?? null);
  const [energy, setEnergy] = useState(existing?.energy ?? null);
  const [flow, setFlow] = useState(existing?.flow ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const { run, pending, error } = useRun();

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => saveDailyLog({ date, mood, libido, energy, flow, symptoms, note: note || null }));
        if (ok) onDone();
      }}
    >
      <div>
        <label className="label">{t('Mood')}</label>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              type="button"
              key={m.key}
              onClick={() => setMood(mood === m.key ? null : m.key)}
              className={`flex flex-col items-center rounded-2xl border py-2 text-[11px] transition ${
                mood === m.key ? 'border-rose bg-rose/20 text-ink' : 'border-line bg-surface-2 text-ink-3'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              {t(m.label)}
            </button>
          ))}
        </div>
      </div>

      <Scale label={t('Horniness')} value={libido} onChange={setLibido} icons={['🧊', '🙂', '😏', '🥵', '😈']} />
      <Scale label={t('Energy')} value={energy} onChange={setEnergy} icons={['🪫', '😪', '🙂', '⚡', '🚀']} />

      {sex === 'female' && (
        <>
          <div>
            <label className="label">{t('Flow')}</label>
            <div className="flex flex-wrap gap-2">
              {FLOWS.map((f) => (
                <button type="button" key={f} onClick={() => setFlow(flow === f ? null : f)} className={`chip capitalize ${flow === f ? 'chip-on' : ''}`}>
                  {'💧'.repeat(FLOWS.indexOf(f) + 1)} {t(f)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('Symptoms')}</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => {
                const on = symptoms.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSymptoms(on ? symptoms.filter((x) => x !== s) : [...symptoms, s])}
                    className={`chip ${on ? 'chip-on' : ''}`}
                  >
                    {t(s)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="label">{t('Note')}</label>
        <textarea className="input min-h-16" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Anything on your mind (or in your pants)…')} />
      </div>
      <FormError error={error} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? t('Saving…') : t('Save check-in')}
      </button>
      {existing && (
        <button
          type="button"
          className="btn w-full text-menstrual"
          disabled={pending}
          onClick={async () => {
            if (confirm(t('Delete this check-in?')) && (await run(() => deleteDailyLog(date)))) onDone();
          }}
        >
          {t('Delete check-in')}
        </button>
      )}
    </form>
  );
}

function Scale({ label, value, onChange, icons }: { label: string; value: number | null; onChange: (n: number | null) => void; icons: string[] }) {
  const { t } = useT();
  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid grid-cols-5 gap-2">
        {icons.map((icon, i) => (
          <button
            type="button"
            key={i}
            onClick={() => onChange(value === i + 1 ? null : i + 1)}
            className={`rounded-2xl border py-2 text-2xl transition ${value === i + 1 ? 'border-rose bg-rose/20' : 'border-line bg-surface-2 opacity-70'}`}
            aria-label={`${label} ${i + 1}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
