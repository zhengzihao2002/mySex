'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { FormError } from '@/components/FormError';
import { Sheet } from '@/components/Sheet';
import type { RestoreCounts } from '@/lib/backups';
export function RestoreBackup() {
  const { t } = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState('');
  const [counts, setCounts] = useState<RestoreCounts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState<RestoreCounts | null>(null);
  const send = async (text: string, apply: boolean) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/restore?apply=${apply}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:text });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Could not restore backup. Try again.');
      if (apply) { setComplete(result.counts); setCounts(null); setRaw(''); router.refresh(); }
      else { setRaw(text); setCounts(result.counts); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not restore backup. Try again.'); }
    finally { setBusy(false); }
  };
  const summary = (c: RestoreCounts) => <ul className="space-y-1 text-sm text-ink-2">
    <li>{t('Sessions: {n}', { n:c.sessions })}</li><li>{t('Your periods: {n}', { n:c.periods })}</li>
    <li>{t('Your check-ins: {n}', { n:c.checkIns })}</li><li>{t('Notes you wrote: {n}', { n:c.notes })}</li>
    <li>{t('Skipped: {n}', { n:c.skipped })}</li>
  </ul>;
  return <div className="space-y-2">
    <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label={t('Choose backup')} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value=''; setComplete(null); setError(null);
      if (!file) return;
      if (file.size > 3*1024*1024) { setError('Backup is too large (maximum 3 MB).'); return; }
      try { await send(await file.text(), false); } catch { setError('Could not read backup file.'); }
    }} />
    <button disabled={busy} className="btn-ghost w-full" onClick={() => input.current?.click()}><Upload size={16} />{busy ? t('Checking backup…') : t('Restore from backup')}</button>
    <p className="text-xs text-ink-3">{t('Preview before restoring. Use an unedited export downloaded after backup restore was added, from this account and partnership.')}</p>
    {!counts && <FormError error={error} />}
    {complete && <div role="status"><p className="font-semibold">{t('Restore complete')}</p>{summary(complete)}</div>}
    <Sheet open={!!counts} onClose={() => { if (!busy) { setCounts(null); setRaw(''); } }} title={t('Preview backup restore')}>
      {counts && summary(counts)}
      <p className="my-4 text-sm text-ink-2">{t('Only missing records are added. Existing records, unfinished timers, inbox items, your partner’s personal entries, and mutually deleted sessions are skipped.')}</p>
      <FormError error={error} />
      <button className="btn-primary w-full" disabled={busy || !counts || counts.sessions+counts.periods+counts.checkIns+counts.notes === 0} onClick={() => send(raw,true)}>{busy ? t('Restoring…') : t('Restore missing records')}</button>
    </Sheet>
  </div>;
}
