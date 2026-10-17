'use client';
import { useT } from '@/components/I18nProvider';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, Download, HeartCrack, Lock, LogOut, Share, SquarePlus } from 'lucide-react';
import { saveSettings, signOutAction, unpair } from '@/app/actions';
import { FormError } from '@/components/FormError';
import { Keypad, usePin } from '@/components/PinLock';
import { Sheet } from '@/components/Sheet';
import { Toggle } from '@/components/SessionForm';
import { useRun } from '@/components/useRun';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { AVATARS } from '@/lib/content';
import { prettyDate } from '@/lib/dates';
import type { Profile } from '@/lib/types';

export function SettingsView({
  me,
  partner,
  anniversary,
  pairedSince,
  devices,
}: {
  me: Profile;
  partner: Profile;
  anniversary: string | null;
  pairedSince: string;
  devices: React.ReactNode;
}) {
  const { t, f } = useT();
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [cycle, setCycle] = useState(me.cycleLengthDefault);
  const [period, setPeriod] = useState(me.periodLengthDefault);
  const [anniv, setAnniv] = useState(anniversary ?? '');
  const [saved, setSaved] = useState(false);
  const [unpairOpen, setUnpairOpen] = useState(false);
  const save = useRun();
  const danger = useRun();

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-2">
        <Link href="/home" className="rounded-full bg-surface-2 p-2" aria-label="Back">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-3xl font-bold">{t('Settings')}</h1>
      </header>

      <form
        className="card space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          const ok = await save.run(() =>
            saveSettings({ name, avatar, cycleLengthDefault: cycle, periodLengthDefault: period, anniversary: anniv || null }),
          );
          setSaved(ok);
        }}
      >
        <div>
          <label className="label">{t('Your name')}</label>
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Avatar')}</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAvatar(a)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${avatar === a ? 'border-rose bg-rose/20' : 'border-line bg-surface-2'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{t('Together since')}</label>
          <input type="date" className="input" value={anniv} onChange={(e) => setAnniv(e.target.value)} />
          <p className="mt-1 text-xs text-ink-3">{t('Used for your days-together counter and anniversary countdowns (you can also tap the counter on Home). Shared with {name}.', { name: partner.name })}</p>
        </div>
        {me.sex === 'female' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('Typical cycle')}</label>
              <input type="number" inputMode="numeric" className="input" min={18} max={50} value={cycle} onChange={(e) => setCycle(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">{t('Typical period')}</label>
              <input type="number" inputMode="numeric" className="input" min={1} max={12} value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
            </div>
            <p className="col-span-2 -mt-2 text-xs text-ink-3">{t('Only used until you’ve logged a few cycles — then mySex learns your real numbers.')}</p>
          </div>
        )}
        <FormError error={save.error} />
        <button className="btn-primary w-full" disabled={save.pending}>
          {save.pending ? t('Saving…') : saved ? t('Saved ✓') : t('Save')}
        </button>
      </form>

      <section className="card flex items-center justify-between">
        <span className="font-semibold">{t('Language')}</span>
        <LanguageSwitch />
      </section>

      <PinSection />

      {devices}

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <SquarePlus size={18} /> {t('Install on iPhone')}
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>{t('Open mySex in Safari.')}</li>
          <li>
            {t('Tap')} <Share size={14} className="inline" /> {t('Share →')} <b>{t('Add to Home Screen')}</b>
          </li>
          <li>{t('Launch it from your home screen for the full-screen app.')}</li>
        </ol>
      </section>

      <section className="card space-y-2">
        <p className="text-sm text-ink-2">
          {t('Paired with')} <b className="text-ink">{partner.name}</b> {partner.avatar} · {t('since {date}', { date: f.prettyDate(pairedSince, { year: true }) })}
        </p>
        <a href="/api/export" className="btn-ghost w-full">
          <Download size={16} /> {t('Export our data (JSON)')}
        </a>
        <form action={signOutAction}>
          <button className="btn-ghost w-full">
            <LogOut size={16} /> {t('Sign out')}
          </button>
        </form>
        <button className="btn w-full text-menstrual" onClick={() => setUnpairOpen(true)}>
          <HeartCrack size={16} /> {t('Unpair')}
        </button>
      </section>

      <p className="px-2 pb-4 text-center text-[11px] leading-relaxed text-ink-3">
        {t('mySex is for consenting adults 18+. Cycle and fertility predictions are estimates, not medical advice or contraception. Your data is stored in your own Neon database and shared only with your partner.')}
      </p>

      <Sheet open={unpairOpen} onClose={() => setUnpairOpen(false)} title={t('Unpair from your partner?')}>
        <p className="mb-4 text-sm text-ink-2">
          {t('You’ll both be taken to the pairing screen.')} <b className="text-ink">{t('Nothing is deleted.')}</b>{' '}
          {t('Reconnect anytime with your invite codes and all your sessions, periods, notes and stats with {name} come right back.', { name: partner.name })}
        </p>
        <FormError error={danger.error} />
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setUnpairOpen(false)}>
            {t('Cancel')}
          </button>
          <button className="btn bg-menstrual text-white" disabled={danger.pending} onClick={() => danger.run(() => unpair())}>
            {t('Unpair (keep our data)')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function PinSection() {
  const { t, f } = useT();
  const { hasPin, setPin } = usePin();
  const [step, setStep] = useState<null | 'new' | 'confirm'>(null);
  const [first, setFirst] = useState('');
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (digits.length !== 4) return;
    const t = setTimeout(async () => {
      if (step === 'new') {
        setFirst(digits);
        setDigits('');
        setStep('confirm');
      } else if (digits === first) {
        await setPin(digits);
        setStep(null);
        setDigits('');
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits('');
          setStep('new');
        }, 400);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [digits, step, first, setPin]);

  return (
    <section className="card">
      <Toggle
        on={hasPin}
        onChange={(on) => (on ? setStep('new') : setPin(null))}
        icon={<Lock size={16} />}
        title={t('Passcode lock')}
        sub={t('Ask for a 4-digit code when opening mySex on this phone')}
      />
      {step && (
        <Keypad
          title={step === 'new' ? t('Choose a passcode') : t('Confirm passcode')}
          digits={digits}
          setDigits={setDigits}
          shake={shake}
          onCancel={() => {
            setStep(null);
            setDigits('');
          }}
        />
      )}
    </section>
  );
}
